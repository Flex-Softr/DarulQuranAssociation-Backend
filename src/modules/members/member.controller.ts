import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { memberService } from './member.service';
import { asyncHandler } from '../common/middleware/async.handler';
import { HTTP_STATUS } from '../../constants';
import { ApiError } from '../common/middleware/error.middleware';
import { getFileUrl } from '../uploads/upload.middleware';
import { config } from '../../config';
import { GetMemberApplicationsQueryInput } from './member.schema';
import { logger } from '../common/utils/logger';
import axios from 'axios';
const SSLCommerzPayment = require("sslcommerz-lts");
import mongoose from 'mongoose';
import { MemberPaymentStatus } from './member.model';


export class MemberController {
  private async validatePaymentCallback(
    valId: string | undefined,
    tranId: string
  ): Promise<void> {
    if (!valId) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Payment validation token is missing');
    }

    let validationData: { status?: string; tran_id?: string };
    try {
      const { data } = await axios.get(config.sslcommerz.endpoints.validate, {
        params: {
          val_id: valId,
          store_id: config.sslcommerz.storeId,
          store_passwd: config.sslcommerz.storePassword,
          format: 'json',
        },
        timeout: 15000,
      });
      validationData = data;
    } catch {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Unable to validate payment callback');
    }

    const status = validationData?.status || '';
    if (!['VALID', 'VALIDATED'].includes(status)) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Payment callback validation failed');
    }

    if (validationData.tran_id !== tranId) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Transaction mismatch in callback');
    }
  }

  getMemberApplications = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as GetMemberApplicationsQueryInput;
    const result = await memberService.getMemberApplications(
      {
        applicationStatus: query.status,
       // paymentStatus: query.paymentStatus as MemberPaymentStatus,
       paymentStatus: query.paymentStatus !== "cancel" ? query.paymentStatus : undefined,
        type: query.type,
        searchTerm: query.searchTerm,
      },
      {
        page: query.page,
        limit: query.limit,
      }
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  getMemberApplicationById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const application = await memberService.getMemberApplicationById(id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: application,
    });
  });

  initiatePayment = asyncHandler(async (req: Request, res: Response) => {
    const {  amount, name, mobile, type  } = req.body;

    if (!name || !mobile || !amount) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'name, mobile, and amount are required');
    }

    const baseUrl = process.env.BASE_URL || `http://localhost:5000`;
    const success_url = `${baseUrl}/api/v1/members/payment/success`;
    const fail_url = `${baseUrl}/api/v1/members/payment/fail`;
    const cancel_url = `${baseUrl}/api/v1/members/payment/cancel`;
    const tran_id = new mongoose.Types.ObjectId().toString();
    // 3️⃣ Payload
    const sslData = {
      total_amount: amount,
      currency: "BDT",
      tran_id: tran_id,
      success_url,
      fail_url,
      cancel_url,
      cus_name: name,
      cus_email: mobile,
      cus_add1: "Dhaka",
      cus_city: "Dhaka",
      cus_country: "Bangladesh",
      cus_phone: mobile,
      shipping_method: "NO",
      product_name: type,
      product_category: "Donation",
      product_profile: "non-physical",
    };
  
    // 4️⃣ Initialize SSLCommerz with proper config (boolean isLive)
    const sslcz = new SSLCommerzPayment(
      config.sslcommerz.storeId,
      config.sslcommerz.storePassword,
      config.sslcommerz.isLive
    );
  
    try {
      const apiResponse = await sslcz.init(sslData);
      
      // Check for SSLCommerz errors
      if (apiResponse.status === 'FAILED' || apiResponse.failedreason) {
        logger.error('SSLCommerz Error', apiResponse);
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          apiResponse.failedreason || 'Payment gateway initialization failed. Please check your SSLCommerz credentials.'
        );
      }
  
      if (apiResponse.GatewayPageURL) {
        const member = await memberService.initiateOnlinePayment({
          ...req.body,
          tran_id: tran_id,
        });
        return res.status(HTTP_STATUS.OK).json({
          success: true,
          data: {
            url: apiResponse.GatewayPageURL,
          },
        });
      }
  
      throw new ApiError(HTTP_STATUS.INTERNAL_ERROR, 'Failed to create payment session');
    } catch (err: any) {
      logger.error('SSLCOMMERZ ERROR', err);
      
      // If it's already an ApiError, rethrow it
      if (err instanceof ApiError) {
        throw err;
      }
      
      // Otherwise, wrap it in a generic error
      throw new ApiError(
        HTTP_STATUS.INTERNAL_ERROR,
        err.message || 'Payment gateway initialization failed'
      );
    }

   // const result = await memberService.initiateOnlinePayment(req.body);
    // res.status(HTTP_STATUS.OK).json({
    //   success: true,
    //   data: result,
    //   message: 'Payment session created successfully',
    // });
  });

  /** ------------------ PAYMENT SUCCESS CALLBACK ------------------ **/
  sslSuccess = asyncHandler(async (req: Request, res: Response) => {
    const { tran_id, val_id } = req.body;
    
    if (!tran_id) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Transaction ID is required');
    }

    await this.validatePaymentCallback(val_id, tran_id);

    // Update donation status by tran_id
    await memberService.updateMember(tran_id, {paymentStatus: "completed"} );

    // Get frontend URL from env or use default
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    // Include tran_id as query parameter for frontend
    const encodedTranId = encodeURIComponent(tran_id);
    const redirectUrl = `${frontendUrl}/payment/success?tran_id=${encodedTranId}`;

    // Return HTML page that redirects to frontend (SSLCommerz sends POST, so redirect() won't work)
    return res.setHeader('Content-Type', 'text/html').send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Success</title>
          <meta http-equiv="refresh" content="0;url=${redirectUrl}">
          <script>window.location.href = "${redirectUrl}";</script>
        </head>
        <body>
          <p>Payment successful! Redirecting...</p>
          <p>If you are not redirected, <a href="${redirectUrl}">click here</a>.</p>
        </body>
      </html>
    `);
  });

  /** ------------------ PAYMENT FAIL CALLBACK ------------------ **/
  sslFail = asyncHandler(async (req: Request, res: Response) => {
    const { tran_id, val_id } = req.body;

    if (!tran_id) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Transaction ID is required');
    }

    await this.validatePaymentCallback(val_id, tran_id);

    // Update donation status
    await memberService.updateMember(tran_id, { paymentStatus: "failed" });

    // Get frontend URL from env or use default
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/payment/fail`;

    // Return HTML page that redirects to frontend
    return res.setHeader('Content-Type', 'text/html').send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Failed</title>
          <meta http-equiv="refresh" content="0;url=${redirectUrl}">
          <script>window.location.href = "${redirectUrl}";</script>
        </head>
        <body>
          <p>Payment failed! Redirecting...</p>
          <p>If you are not redirected, <a href="${redirectUrl}">click here</a>.</p>
        </body>
      </html>
    `);
  });

  /** ------------------ PAYMENT CANCEL CALLBACK ------------------ **/
  sslCancel = asyncHandler(async (req: Request, res: Response) => {
    const { tran_id, val_id } = req.body;

    if (!tran_id) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Transaction ID is required');
    }

    await this.validatePaymentCallback(val_id, tran_id);

    // Update donation status
    await memberService.updateMember(tran_id, { paymentStatus: "cancel" });

    // Get frontend URL from env or use default
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/payment/unsuccessfull`;

    // Return HTML page that redirects to frontend
    return res.setHeader('Content-Type', 'text/html').send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Cancelled</title>
          <meta http-equiv="refresh" content="0;url=${redirectUrl}">
          <script>window.location.href = "${redirectUrl}";</script>
        </head>
        <body>
          <p>Payment cancelled! Redirecting...</p>
          <p>If you are not redirected, <a href="${redirectUrl}">click here</a>.</p>
        </body>
      </html>
    `);
  });

  completePayment = asyncHandler(async (req: Request, res: Response) => {
    const application = await memberService.completeOnlinePayment(req.body);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        id: application.id,
        type: application.type,
        status: application.applicationStatus,
        transactionId: application.transactionId,
      },
      message: 'Member application submitted successfully',
    });
  });

  submitApplication = asyncHandler(async (req: Request, res: Response) => {
    const paymentDocument = req.file as Express.Multer.File | undefined;

    if (!paymentDocument) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Payment document is required');
    }

    const paymentDocumentUrl = getFileUrl(paymentDocument.filename);

    const application = await memberService.submitBankApplication(req.body, paymentDocumentUrl);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: {
        id: application.id,
        type: application.type,
        status: application.applicationStatus,
        paymentMethod: application.paymentMethod,
      },
      message: 'Application submitted successfully',
    });
  });

  updateMemberApplicationStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
 //   console.log("req.body", req.params);
    const application = await memberService.updateMemberApplicationStatus(id, status);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: application,
      message: 'Application status updated successfully',
    });
  });
  updateMemberApplicationPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
  //  console.log("req.body", req.params);
    const { paymentStatus } = req.body;
 //   console.log("id", req.body);
 //   console.log("paymentStatus", paymentStatus);
    const application = await memberService.updateMemberApplicationPaymentStatus(id, paymentStatus);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: application,
      message: 'Application payment status updated successfully',
    });
  });

  deleteMemberApplication = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const application = await memberService.deleteMemberApplication(id);

    if (application.paymentDocumentUrl) {
      const relativePath = application.paymentDocumentUrl
        .replace('/api/uploads/', '')
        .replace('/uploads/', '')
        .replace(/^\/+/, '');
      const filePath = path.resolve(process.cwd(), config.upload.dir, relativePath);
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) {
            logger.error('Error deleting payment document:', err);
          }
        });
      }
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Member application deleted successfully',
    });
  });
}

export const memberController = new MemberController();


