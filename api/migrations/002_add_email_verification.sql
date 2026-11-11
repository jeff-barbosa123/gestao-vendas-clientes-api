-- Migration: add email verification columns to users table
-- Safe to run multiple times

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS email_verification_token TEXT;

-- 002_add_email_verification.sql
-- Adds email verification fields to users table

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verification_token TEXT;

CREATE INDEX IF NOT EXISTS users_email_verification_token_idx
  ON users(email_verification_token);

