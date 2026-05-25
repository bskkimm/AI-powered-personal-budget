import type { RawEvent, ExtractionResult } from "@ai-budget/core";

function emptyResult(
  event: RawEvent,
): ExtractionResult {
  return {
    datetime: event.received_at,
    amount_value: null,
    currency: null,
    display_amount: null,
    merchant: null,
    country: null,
    payment_platform: null,
    payment_method: null,
    transaction_type: "expense",
    category: null,
    subcategory: null,
    memo: null,
    location: null,
    balance_after: null,
    card_last4: null,
    source_channel: event.source_channel,
    source_name: event.source_name,
    actual_account_id: null,
    actual_category_id: null,
    needs_review: false,
    confidence: {
      datetime: 0.5,
      amount: 0,
      currency: 0,
      merchant: 0,
      category: 0,
      account_mapping: 0,
    },
  };
}

function extractFromManualBody(
  event: RawEvent,
): ExtractionResult {
  const result = emptyResult(event);
  const body = event.body as Record<string, unknown>;

  if (typeof body.amount === "number") {
    result.amount_value = body.amount;
    result.confidence.amount = 1.0;
  }
  if (typeof body.currency === "string") {
    result.currency = body.currency;
    result.confidence.currency = 1.0;
  }
  if (typeof body.merchant === "string") {
    result.merchant = body.merchant;
    result.confidence.merchant = 1.0;
  }
  if (typeof body.payment_method === "string") {
    result.payment_method = body.payment_method;
  }
  if (typeof body.category === "string") {
    result.category = body.category;
    result.confidence.category = 0.8;
  }
  if (typeof body.country === "string") {
    result.country = body.country;
    result.confidence.merchant = Math.max(result.confidence.merchant, 0.5);
  }
  if (typeof body.actual_account_name === "string") {
    result.actual_account_id = body.actual_account_name;
  }
  if (typeof body.actual_account_id === "string") {
    result.actual_account_id = body.actual_account_id;
  }
  if (typeof body.display_amount === "string") {
    result.display_amount = body.display_amount;
  }

  if (result.merchant === null) {
    result.needs_review = true;
  }

  return result;
}

function extractFromPayPayJP(
  event: RawEvent,
): ExtractionResult {
  const result = emptyResult(event);
  const body = typeof event.body === "string" ? event.body : "";

  const amountMatch = body.match(/(\d+)円/);
  if (amountMatch) {
    result.amount_value = parseInt(amountMatch[1], 10);
    result.currency = "JPY";
    result.confidence.amount = 1.0;
    result.confidence.currency = 1.0;
  } else {
    result.needs_review = true;
  }

  const merchantMatch = body.trim().match(/^(.+?)で/);
  if (merchantMatch) {
    result.merchant = merchantMatch[1];
    result.confidence.merchant = 0.9;
  }

  result.payment_platform = "PayPay";
  result.payment_method = "PayPay";
  result.country = "JP";
  result.actual_account_id = "PayPay";
  result.confidence.account_mapping = 0.9;

  return result;
}

function extractFromKoreanNotification(
  event: RawEvent,
): ExtractionResult {
  const result = emptyResult(event);
  const body = typeof event.body === "string" ? event.body : "";

  const amountMatch = body.match(/([\d,]+)원/);
  if (amountMatch) {
    const rawAmount = amountMatch[1].replace(/,/g, "");
    result.amount_value = parseInt(rawAmount, 10);
    result.currency = "KRW";
    result.confidence.amount = 1.0;
    result.confidence.currency = 1.0;
  }

  result.merchant = null;
  result.category = null;
  result.confidence.merchant = 0;
  result.confidence.category = 0;
  result.needs_review = true;

  return result;
}

function extractFromSMBCCard(
  event: RawEvent,
): ExtractionResult {
  const result = emptyResult(event);
  const body = typeof event.body === "string" ? event.body : "";

  const amountMatch = body.match(/金額:\s*(\d+)円/);
  if (amountMatch) {
    result.amount_value = parseInt(amountMatch[1], 10);
    result.currency = "JPY";
    result.confidence.amount = 1.0;
    result.confidence.currency = 1.0;
  } else {
    result.needs_review = true;
  }

  const merchantMatch = body.match(/店舗:\s*(.+)$/m);
  if (merchantMatch) {
    result.merchant = merchantMatch[1].trim();
    result.confidence.merchant = 1.0;
  } else if (result.merchant === null) {
    result.needs_review = true;
  }

  result.payment_method = "SMBC Card";
  result.payment_platform = "SMBC Card";
  result.country = "JP";
  result.actual_account_id = "SMBC Card";
  result.confidence.account_mapping = 0.9;

  return result;
}

export function extractFromRawEvent(event: RawEvent): ExtractionResult {
  if (event.source_channel === "manual") {
    return extractFromManualBody(event);
  }

  if (
    event.source_channel === "phone_notification" &&
    event.source_name === "paypay"
  ) {
    return extractFromPayPayJP(event);
  }

  if (
    event.source_channel === "phone_notification" &&
    event.source_name === "unknown_korean_payment_app"
  ) {
    return extractFromKoreanNotification(event);
  }

  if (
    event.source_channel === "email" &&
    event.source_name === "smbc"
  ) {
    return extractFromSMBCCard(event);
  }

  const result = emptyResult(event);
  result.needs_review = true;
  return result;
}
