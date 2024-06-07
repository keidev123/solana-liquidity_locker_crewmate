use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct GlobalState {
    pub admin: Pubkey,
    pub locked_lp_num: u32,  // total lock num by users
    pub withdraw_times: u32, // total withdrawn numbers
    pub minimum_lock_duration: u64,
    pub minimum_lock_percent: u32,
}

#[account]
#[derive(Default)]
pub struct LockState {
    pub owner: Pubkey,
    pub base_mint: Pubkey,
    pub lp_mint: Pubkey,
    pub amount: u64,
    pub start_date: u64,
    pub end_date: u64,
    pub pool_id: Pubkey,
    pub lp_vault: Pubkey,
    pub locked: bool,
    pub lock_token_times: u8,
    pub locked_num: u8,
    pub lock_seed: u64,
}
