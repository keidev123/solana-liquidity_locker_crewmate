
use anchor_lang::prelude::*;
use crate::{constant::*, state::*, errors::CustomErrors::*};

pub fn handle(ctx: Context<ChangeLockPeriod>, new_period: u64) ->Result<()> {
  if ctx.accounts.admin.to_account_info().key() != ctx.accounts.global_state.admin {
    return Err(InvalidAdmin.into());
  }
  if new_period <= 0 {
    return Err(InvalidPeriod.into());
  }


  ctx.accounts.global_state.minimum_lock_duration = new_period;

  Ok(())
}

#[derive(Accounts)]
#[instruction()]
pub struct ChangeLockPeriod<'info> {
  #[account(
    mut,
    seeds = [GLOBAL_SEED],
    bump,
  )]
  pub global_state: Box<Account<'info, GlobalState>>,

  #[account(mut)]
  pub admin: Signer<'info>,

  pub system_program: Program<'info, System>,
}

