use crate::{constant::*, errors::CustomErrors::*, state::*};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer as SplTransfer};
use std::mem::size_of;

pub fn handle(ctx: Context<Lock>, seed: u64, lock_amount: u64, lock_duration: u64) -> Result<()> {
    msg!("{}", ctx.accounts.lp_mint.supply);
    let minumum_lock_amount = ctx
        .accounts
        .lp_mint
        .supply
        .checked_div(10000)
        .ok_or(MathOverflow)?
        .checked_mul(ctx.accounts.global_state.minimum_lock_percent as u64)
        .ok_or(MathOverflow)?;
    if lock_amount < minumum_lock_amount {
        return Err(SmallLpLockAmount.into());
    }
    if lock_duration < ctx.accounts.global_state.minimum_lock_duration {
        return Err(ShorterLockDuration.into());
    }

    let lock_state = &mut ctx.accounts.lock_state;
    let current_time = Clock::get()?.unix_timestamp as u64;

    let lock_end_time = current_time
        .checked_add(lock_duration)
        .ok_or(MathOverflow)?;

    let destination = &ctx.accounts.vault_ata;
    let source = &ctx.accounts.user_ata;
    let token_program = &ctx.accounts.token_program;
    let authority = &ctx.accounts.owner;
    let global_state = &mut ctx.accounts.global_state;

    // Transfer tokens from taker to initializer
    let cpi_accounts = SplTransfer {
        from: source.to_account_info().clone(),
        to: destination.to_account_info().clone(),
        authority: authority.to_account_info().clone(),
    };
    let cpi_program = token_program.to_account_info();

    token::transfer(CpiContext::new(cpi_program, cpi_accounts), lock_amount)?;

    lock_state.base_mint = ctx.accounts.base_mint.key();
    lock_state.owner = ctx.accounts.owner.key();
    lock_state.pool_id = ctx.accounts.pool.key();
    lock_state.lp_mint = ctx.accounts.lp_mint.key();
    lock_state.amount = lock_amount;
    lock_state.locked = true;
    let current_time = Clock::get()?.unix_timestamp as u64;
    lock_state.start_date = current_time;
    lock_state.end_date = lock_end_time;
    lock_state.lock_token_times = 1;
    lock_state.lock_seed = seed;

    // increase locked times
    global_state.locked_lp_num += 1;

    Ok(())
}

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct Lock<'info> {
    #[account(
    init,
    payer = owner,  
    space = 8 + size_of::<LockState>(),
    seeds = [owner.key().as_ref(), lp_mint.key().as_ref(), seed.to_le_bytes().as_ref()],
    bump,
  )]
    pub lock_state: Box<Account<'info, LockState>>,

    #[account(
      mut,
      seeds = [GLOBAL_SEED],
      bump
    )]
    pub global_state: Box<Account<'info, GlobalState>>,

    #[account(mut)]
    pub lp_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub base_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub vault_ata: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub user_ata: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    /// CHECK: Frontend will check for now
    pub pool: AccountInfo<'info>,

    #[account(mut)]
    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
