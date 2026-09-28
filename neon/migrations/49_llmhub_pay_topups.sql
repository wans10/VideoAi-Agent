begin;

create table if not exists llmhub_pay_topup_orders (
  out_trade_no text primary key,
  user_id text not null,
  wallet_amount_cents integer not null check (wallet_amount_cents >= 1000),
  settlement_amount_fen integer not null check (settlement_amount_fen > 0),
  payment_type text not null check (payment_type in ('alipay', 'wxpay')),
  provider_trade_no text unique,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  checkout_attempt_id bigint references checkout_attempts(id) on delete set null,
  quote_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists llmhub_pay_topup_orders_user_created_idx
  on llmhub_pay_topup_orders (user_id, created_at desc);

alter table app_receipts add column if not exists llmhub_pay_out_trade_no text;
create unique index if not exists app_receipts_llmhub_pay_order_unique
  on app_receipts (llmhub_pay_out_trade_no)
  where llmhub_pay_out_trade_no is not null;

alter table checkout_attempts add column if not exists llmhub_pay_out_trade_no text;
create index if not exists checkout_attempts_llmhub_pay_order_idx
  on checkout_attempts (llmhub_pay_out_trade_no)
  where llmhub_pay_out_trade_no is not null;

commit;
