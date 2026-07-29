import Razorpay from 'razorpay';
import { env } from '@/lib/env';

export const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || env.RAZORPAY_KEY_SECRET || '';

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

export const razorpay = getRazorpayInstance();
