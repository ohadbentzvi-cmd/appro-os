-- Charge generation is now automatic (triggered at building onboarding and
-- payment-config updates). The manual/cron generation flow and its audit log
-- are no longer needed.
DROP TABLE IF EXISTS charge_generation_log;
