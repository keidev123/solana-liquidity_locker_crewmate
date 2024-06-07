use crate::{constant::*, errors::CustomErrors::*, state::*};
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

pub fn handle(ctx: Context<IncreaseLockPeriod>, seed: u64, lock_duration: u64) -> Result<()> {
    let lock_state = &mut ctx.accounts.lock_state;
    if !lock_state.locked {
        return Err(LpAlreadyWithdrawn.into());
    }
    if lock_state.lock_seed != seed {
        return Err(InvalidLock.into());
    }
    if lock_duration < MINIMUM_LOCK_INCREASE_DURATION {
        return Err(ShortExtendTime.into());
    }
    ctx.accounts.lock_state.end_date += lock_duration;

    Ok(())
}

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct IncreaseLockPeriod<'info> {
    #[account(
      mut,
      seeds = [owner.key().as_ref(), lp_mint.key().as_ref(), seed.to_le_bytes().as_ref()],
      bump
    )]
    pub lock_state: Box<Account<'info, LockState>>,

    #[account(mut)]
    pub lp_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}
