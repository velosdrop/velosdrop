// lib/pubnub.ts
import PubNub from "pubnub";

const publishKey = process.env.NEXT_PUBLIC_PUBNUB_PUBLISH_KEY;
const subscribeKey = process.env.NEXT_PUBLIC_PUBNUB_SUBSCRIBE_KEY;

// Check if keys are available
if (!publishKey || !subscribeKey) {
  throw new Error('PubNub Publish and Subscribe keys are required. Please check your environment variables.');
}

// Server-side singleton
export const pubnub = new PubNub({
  publishKey: publishKey,
  subscribeKey: subscribeKey,
  userId: "server",
});

// User-specific clients (e.g. driver, customer)
export const createPubNubClient = (userId: string) => {
  return new PubNub({
    publishKey: publishKey,
    subscribeKey: subscribeKey,
    userId,
  });
};