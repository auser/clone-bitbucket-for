import dotenv from 'dotenv';
import { read } from "@1password/op-js";
import * as OTPAuth from 'otpauth';
import path from 'path';

dotenv.config();

export interface BitbucketAuth {
  username: string;
  password: string;
  bitbucketOtp: string;  // For Bitbucket 2FA
  atlassianOtp: string;  // For Atlassian 2FA
  baseUrl: string;
}

export interface BitbucketConfig {
  username: string;
  password: string;
  baseUrl: string;
}

export interface OnePasswordConfig {
  prefix: string;
}

export interface Config {
  clonePath: string; // Path to clone the repositories to
  logDir?: string; // Directory to store log files
  logFile?: string; // Name of the log file
}

export function getConfig(): Config {
  const clonePath = process.env.CLONE_PATH || path.join(process.cwd(), 'code');
  const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
  const logFile = process.env.LOG_FILE || 'scraper.log';

  return {
    clonePath,
    logDir,
    logFile
  };
}

export async function getBitbucketAuth(): Promise<BitbucketAuth> {
  const onePasswordConfig = getOnePasswordConfig();
  const usernamePath = `${onePasswordConfig.prefix}/username`;
  const passwordPath = `${onePasswordConfig.prefix}/password`;
  const baseUrl = process.env.BITBUCKET_BASE_URL || 'https://bitbucket.org';

  const username = await read.parse(usernamePath);
  const password = await read.parse(passwordPath);

  // Get both OTP secrets
  const bitbucketOtpPath = `${onePasswordConfig.prefix}/otp`; // For Bitbucket 2FA
  const atlassianOtpPath = `${onePasswordConfig.prefix}/one-time password`; // For Atlassian 2FA

  const bitbucket_otp_secret = await read.parse(bitbucketOtpPath);
  const atlassian_otp_secret = await read.parse(atlassianOtpPath);
  // Generate both OTP codes
  const bitbucket_otp_code = generateTOTP(bitbucket_otp_secret);
  const atlassian_otp_code = generateTOTP(atlassian_otp_secret);

  if (!username || !password || !bitbucket_otp_code || !atlassian_otp_code) {
    throw new Error('BITBUCKET_USERNAME, BITBUCKET_PASSWORD, and both OTP codes are required');
  }

  return {
    username,
    password,
    bitbucketOtp: bitbucket_otp_code,
    atlassianOtp: atlassian_otp_code,
    baseUrl
  };
}

export async function getBitbucketConfig(): Promise<BitbucketConfig> {
  const onePasswordConfig = getOnePasswordConfig();
  const usernamePath = `${onePasswordConfig.prefix}/username`;
  const passwordPath = `${onePasswordConfig.prefix}/password`;
  const baseUrl = process.env.BITBUCKET_BASE_URL || 'https://bitbucket.org';

  const username = await read.parse(usernamePath);
  const password = await read.parse(passwordPath);

  if (!username || !password) {
    throw new Error('BITBUCKET_USERNAME and BITBUCKET_PASSWORD environment variables are required');
  }

  const config: BitbucketConfig = {
    username: username.toString(),
    password: password.toString(),
    baseUrl
  };

  return config;
}

// Fixed: Handle both otpauth:// URLs and raw base32 secrets
export const generateTOTP = (secret_input: string, timestamp: number = Date.now()) => {
  try {

    let secret_string: string;

    // Check if input is an otpauth:// URL
    if (secret_input.startsWith('otpauth://')) {
      const url = new URL(secret_input);
      const secretParam = url.searchParams.get('secret');

      if (!secretParam) {
        throw new Error('No secret parameter found in otpauth URL');
      }

      secret_string = secretParam;
    } else {
      // Assume it's a raw base32 secret
      secret_string = secret_input;
    }

    // Check if we got a path instead of a secret
    if (secret_string?.includes('op://')) {
      throw new Error('Received 1Password path instead of secret value. Check your read.parse() call.');
    }

    // Clean the secret - remove any whitespace and convert to uppercase
    const cleanSecret = secret_string?.trim().toUpperCase().replace(/\s/g, '');

    if (!cleanSecret || cleanSecret.length === 0) {
      throw new Error('Empty or invalid secret provided');
    }

    const secret = OTPAuth.Secret.fromBase32(cleanSecret);

    const totp = new OTPAuth.TOTP({
      issuer: "Bitbucket",
      label: "Bitbucket Account",
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });

    // Generate with current time if no timestamp provided
    return totp.generate({ timestamp });
  } catch (error) {
    console.error('Error generating TOTP:', error);
    console.error('Input that caused error:', secret_input);
    throw new Error('Failed to generate TOTP code from secret');
  }
};

export function getOnePasswordConfig(): OnePasswordConfig {
  const prefix = process.env.ONEPASSWORD_PREFIX;

  if (!prefix) {
    throw new Error('ONEPASSWORD_PREFIX environment variable is required');
  }

  const config: OnePasswordConfig = {
    prefix
  };

  return config;
}