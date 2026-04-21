import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OTPType = "phone" | "email";

interface SendResult {
  success: boolean;
  error?: string;
}

interface VerifyResult {
  success: boolean;
  is_new_user?: boolean;
  user_id?: string;
  error?: string;
}

export function useOTP() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [devOTP, setDevOTP] = useState<string | null>(null);

  const sendOTP = async (identifier: string, type: OTPType): Promise<SendResult> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { identifier, type },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setOtpSent(true);
      if (data?.dev_otp) {
        setDevOTP(data.dev_otp);
        // eslint-disable-next-line no-console
        console.log("🔑 DEV OTP:", data.dev_otp);
      }
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send OTP";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (
    identifier: string,
    type: OTPType,
    otp_code: string,
  ): Promise<VerifyResult> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { identifier, type, otp_code },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return {
        success: true,
        is_new_user: data?.is_new_user,
        user_id: data?.user_id,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to verify OTP";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setOtpSent(false);
    setError(null);
    setDevOTP(null);
  };

  return { sendOTP, verifyOTP, loading, error, otpSent, devOTP, reset };
}
