// Koo credits pricing, shared by the extension (public) and the cloud worker (private, in cloud/).
// 1 Koo credit = ₹1 = 1 AI request; each request is one batch of 5 posts. Packs start at ₹100.
export const PACKS = [100, 200, 500] as const;
export const creditsFor = (rupees: number) => rupees;
export const BATCH_SIZE = 5; // posts per AI request, fixed (the extension always batches 5; the API rejects more)
export const REQUESTS_PER_CREDIT = 1;
export const REQUEST_COST = 1 / REQUESTS_PER_CREDIT; // 1 credit
export const SIGNUP_BONUS = 50; // free credits on a new account's first sign-in (= 50 requests)
