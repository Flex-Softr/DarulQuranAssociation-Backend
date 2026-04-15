// import { Request, Response, NextFunction } from 'express';
// import { donationService } from './donation.service';
// import { ApiError } from '@/modules/common/middleware/error.middleware';
// import { HTTP_STATUS } from '@/constants';
// import { asyncHandler } from '@/modules/common/middleware/async.handler';
// import { DonationStatus, DonationPurpose } from './donation.model';
// import axios from 'axios';

// export class DonationController {
//   /**
//    * Create new donation (public endpoint)
//    * POST /api/donations
//    */
//   // createDonation = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
//   //   const { purpose, contact, amount } = req.body;

//   //   const donation = await donationService.createDonation({
//   //     purpose,
//   //     contact,
//   //     amount,
//   //   });

//   //   res.status(HTTP_STATUS.CREATED).json({
//   //     success: true,
//   //     data: {
//   //       id: donation.id,
//   //       purpose: donation.purpose,
//   //       contact: donation.contact,
//   //       amount: donation.amount,
//   //       status: donation.status, 
//   //       createdAt: donation.createdAt,
//   //       updatedAt: donation.updatedAt,
//   //     },
//   //     message: 'Donation submitted successfully',
//   //   });
//   // });

//   createDonation = asyncHandler(async (req: Request, res: Response) => {
//     const { purpose, contact, amount, success_url, fail_url, cancel_url } = req.body;
  
//     // 1️⃣ Save donation in DB first
//     const donation = await donationService.createDonation({
//       purpose,
//       contact,
//       amount,
//     });
  
//     // 2️⃣ SSLCOMMERZ payload
//     const sslData = {
//       store_id: process.env.SSLCOMMERZ_STORE_ID,
//       store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD,
//       total_amount: amount,
//       currency: "BDT",
//       tran_id: donation.id, // UNIQUE ID
//       success_url,
//       fail_url,
//       cancel_url,
  
//       // Customer data (required)
//       cus_name: "Donor",
//       cus_email: contact,
//       cus_add1: "Dhaka",
//       cus_city: "Dhaka",
//       cus_country: "Bangladesh",
//       cus_phone: contact,
  
//       // Shipment (required but can be dummy)
//       shipping_method: "NO",
//       product_name: purpose,
//       product_category: "Donation",
//       product_profile: "non-physical",
//     };
  
//     const apiUrl = process.env.SSLCOMMERZ_IS_LIVE === "true"
//       ? "https://securepay.sslcommerz.com/gwprocess/v4/api.php"
//       : "https://sandbox.sslcommerz.com/gwprocess/v4/api.php";
  
//     // 3️⃣ Call SSLCOMMERZ API
//     const response = await axios.post(apiUrl, sslData);
  
//     if (response.data?.GatewayPageURL) {
//       return res.json({
//         success: true,
//         data: {
//           id: donation.id,
//           url: response.data.GatewayPageURL, // frontend will redirect here
//         },
//       });
//     }
  
//     return res.status(500).json({
//       success: false,
//       message: "Failed to create payment session",
//     });
//   });
  
//   /**
//    * Get all donations (admin only)
//    * GET /api/donations
//    * Query params: page, limit, status, purpose, startDate, endDate
//    */
//   getAllDonations = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
//     const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
//     const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
//     const status = req.query.status as DonationStatus | undefined;
//     const purpose = req.query.purpose as DonationPurpose | undefined;
//     const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
//     const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

//     const filters = {
//       ...(status && { status }),
//       ...(purpose && { purpose }),
//       ...(startDate && { startDate }),
//       ...(endDate && { endDate }),
//     };

//     const result = await donationService.getAllDonations(filters, { page, limit });

//     res.status(HTTP_STATUS.OK).json({
//       success: true,
//       data: result.data.map((donation) => ({
//         id: donation.id,
//         purpose: donation.purpose,
//         contact: donation.contact,
//         amount: donation.amount,
//         status: donation.status,
//         createdAt: donation.createdAt,
//         updatedAt: donation.updatedAt,
//       })),
//       pagination: result.pagination,
//     });
//   });

//   /**
//    * Get single donation (admin only)
//    * GET /api/donations/:id
//    */
//   getDonationById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
//     const { id } = req.params;
//     const donation = await donationService.getDonationById(id);

//     res.status(HTTP_STATUS.OK).json({
//       success: true,
//       data: {
//         id: donation.id,
//         purpose: donation.purpose,
//         contact: donation.contact,
//         amount: donation.amount,
//         status: donation.status,
//         createdAt: donation.createdAt,
//         updatedAt: donation.updatedAt,
//       },
//     });
//   });

//   /**
//    * Get current user's donations
//    * GET /api/donations/my
//    */
//   getMyDonations = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
//     if (!req.user) {
//       throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Not authenticated');
//     }

//     // List donations by contact matching user's email or phone
//     const contacts: string[] = [];
//     if (req.user.email) contacts.push(req.user.email);
//     if (req.user.phone) contacts.push(req.user.phone);

//     const filtered = await donationService.getDonationsByContacts(contacts);

//     res.status(HTTP_STATUS.OK).json({
//       success: true,
//       data: filtered.map((donation) => ({
//         _id: donation.id,
//         userId: req.user?.id,
//         amount: donation.amount,
//         method: undefined,
//         reference: undefined,
//         status: (donation.status as string).toUpperCase(),
//         createdAt: donation.createdAt,
//         updatedAt: donation.updatedAt,
//       })),
//     });
//   });
// }

// sslSuccess = asyncHandler(async (req: Request, res: Response) => {
//   const { tran_id } = req.body;

//   await donationService.updateDonationStatus(tran_id, "success");

//   return res.redirect(`${process.env.FRONTEND_URL}/payment/success`);
// });

// sslFail = asyncHandler(async (req: Request, res: Response) => {
//   const { tran_id } = req.body;

//   await donationService.updateDonationStatus(tran_id, "failed");

//   return res.redirect(`${process.env.FRONTEND_URL}/payment/fail`);
// });

// sslCancel = asyncHandler(async (req: Request, res: Response) => {
//   const { tran_id } = req.body;

//   await donationService.updateDonationStatus(tran_id, "cancelled");

//   return res.redirect(`${process.env.FRONTEND_URL}/payment/unsuccessfull`);
// });



// export const donationController = new DonationController();

import { Request, Response, NextFunction } from 'express';
import { donationService } from './donation.service';
import { HTTP_STATUS } from '../../constants';
import { asyncHandler } from '../common/middleware/async.handler';
import { DonationStatus, DonationPurpose, DONATION_STATUS, IDonation, Donation } from './donation.model';
import axios from 'axios';
import { ApiError } from '../common/middleware/error.middleware';
import { config } from '../../config';
import mongoose from 'mongoose';
import { logger } from '../common/utils/logger';

const SSLCommerzPayment = require("sslcommerz-lts");
export class DonationController {
  private async validatePaymentCallback(
    valId: string | undefined,
    tranId: string
  ): Promise<void> {
    if (!valId) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Payment validation token is missing');
    }

    let validationData: { status?: string; tran_id?: string; amount?: string | number };
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
    } catch (error) {
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

  /** ------------------ CREATE DONATION + SSLCOMMERZ ------------------ **/
//   createDonation = asyncHandler(async (req: Request, res: Response) => {
//     const { purpose, contact, amount } = req.body;

//     // 1️⃣ Save donation in DB
//     const donation = await donationService.createDonation({
//       purpose,
//       contact,
//       amount,
//     });

//     // 2️⃣ SSLCOMMERZ URLs (backend controlled)
//     const success_url = `${process.env.BASE_URL}/api/donations/payment/success`;
//     const fail_url = `${process.env.BASE_URL}/api/donations/payment/fail`;
//     const cancel_url = `${process.env.BASE_URL}/api/donations/payment/cancel`;

//     // 3️⃣ Payload
//     const sslData = {
      
//       total_amount: amount,
//       currency: "BDT",
//       tran_id: donation.id,

//       success_url,
//       fail_url,
//       cancel_url,

//       cus_name: "Donor",
//       cus_email: contact,
//       cus_add1: "Dhaka",
//       cus_city: "Dhaka",
//       cus_country: "Bangladesh",
//       cus_phone: contact,

//       shipping_method: "NO",
//       product_name: purpose,
//       product_category: "Donation",
//       product_profile: "non-physical",
//     };

// //     const apiUrl =
// //       process.env.SSLCOMMERZ_IS_LIVE === "true"
// //         ? "https://securepay.sslcommerz.com/gwprocess/v4/api.php"
// //         : "https://sandbox.sslcommerz.com/gwprocess/v4/api.php";

// //     // 4️⃣ Create SSLCOMMERZ Session
// //     const response = await axios.post(apiUrl, sslData);
// // console.log(response.data);
//  const sslcz = new SSLCommerzPayment(store_id, store_password, is_live);
//     sslcz.init(sslData).then((apiResponse: any) => {
//         let GatewayPageURL = apiResponse.GatewayPageURL;
//         res.send({ url: GatewayPageURL });
//     });

//     // if (apiResponse.GatewayPageURL) {
//     //   return res.json({
//     //     success: true,
//     //     data: {
//     //       id: donation.id,
//     //       url: response.data.GatewayPageURL,
//     //     },
//     //   });
//     // }

//     return res.status(500).json({
//       success: false,
//       message: "Failed to create payment session",
//     });
//   });
createDonation = asyncHandler(async (req: Request, res: Response) => {
  const { purpose, contact, amount, name, behalf } = req.body;

  // Validate required fields
  if (!purpose || !contact || !amount) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Purpose, contact, and amount are required');
  }

  // 1️⃣ Save donation in DB
  

  // 2️⃣ SSLCOMMERZ URLs
  const baseUrl = process.env.BASE_URL || `http://localhost:5000`;
  const success_url = `${baseUrl}/api/v1/donations/payment/success`;
  const fail_url = `${baseUrl}/api/v1/donations/payment/fail`;
  const cancel_url = `${baseUrl}/api/v1/donations/payment/cancel`;
  const tran_id = new mongoose.Types.ObjectId().toString();
  // 3️⃣ Payload
  const sslData = {
    total_amount: amount,
    currency: "BDT",
    tran_id: tran_id,
    success_url,
    fail_url,
    cancel_url,
    cus_name: "Donor",
    cus_email: contact,
    cus_add1: "Dhaka",
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
    cus_phone: contact,
    shipping_method: "NO",
    product_name: purpose,
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
      const donation = await donationService.createDonation({
        purpose,
        contact,
        amount,
        name,
        behalf,
        tran_id: tran_id,
      });
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          id: donation.id,
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
});
  /** ------------------ PAYMENT SUCCESS CALLBACK ------------------ **/
  sslSuccess = asyncHandler(async (req: Request, res: Response) => {
    const { tran_id, val_id } = req.body;
    
    if (!tran_id) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Transaction ID is required');
    }

    await this.validatePaymentCallback(val_id, tran_id);

    // Update donation status by tran_id after gateway validation
    await donationService.updateDonation(tran_id, { status: DONATION_STATUS.COMPLETED });

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
    await donationService.updateDonation(tran_id, { status: "failed" });

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
    await donationService.updateDonation(tran_id, { status: DONATION_STATUS.FAILED });

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

  /** ------------------ ADMIN FUNCTIONS BELOW ------------------ **/

  getAllDonations = asyncHandler(async (req: Request, res: Response) => {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const tran_id = req.query.tran_id as string | undefined;
    const purpose = req.query.purpose as DonationPurpose | undefined;
    const contact = req.query.contact as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    // Always filter by status 'completed'
    const filters = {
      status: DONATION_STATUS.COMPLETED as DonationStatus,
      ...(tran_id && { tran_id }),
      ...(purpose && { purpose }),
      ...(contact && { contact }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    };
    
    const result = await donationService.getAllDonations(filters, { page, limit });
    
    // Calculate total donation amount with the same filters
    const totalDonationAmount = await donationService.getTotalDonationAmount(filters);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      totalDonationAmount,
    });
  });

  getDonationById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const donation = await donationService.getDonationById(id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: donation,
    });
  });

  getMyDonations = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Not authenticated");
    }

    const contacts: string[] = [];
    if (req.user.email) contacts.push(req.user.email);
    if (req.user.phone) contacts.push(req.user.phone);

    const filtered = await donationService.getDonationsByContacts(contacts);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: filtered,
    });
  });
}

export const donationController = new DonationController();
