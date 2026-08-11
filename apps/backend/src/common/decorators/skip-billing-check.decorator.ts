import { SetMetadata } from "@nestjs/common";

export const SKIP_BILLING_CHECK_KEY = "skipBillingCheck";
export const SkipBillingCheck = () => SetMetadata(SKIP_BILLING_CHECK_KEY, true);
