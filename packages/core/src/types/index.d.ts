import { Express } from "express";

declare global {
  namespace Express {
    interface Locals {
      otp: {
        generateOtp: (size?: number) => readonly [string, string];
        verifyOtp: (size?: number) => readonly [string, string];
      };
    }
  }
}
