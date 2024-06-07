
use anchor_lang::prelude::*;
use crate::{constant::*, state::*, errors::CustomErrors::*};

pub fn handle(ctx: Context<ChangeLockPercent>, new_percent: u64) ->Result<()> {
  if ctx.accounts.admin.to_account_info().key() != ctx.accounts.global_state.admin {
    return Err(InvalidAdmin.into());
  }
  if new_percent <= 0 || new_percent > 10000 {
    return Err(InvalidAmount.into());
  }

  ctx.accounts.global_state.minimum_lock_percent = new_percent as u32;
  Ok(())
}

#[derive(Accounts)]
#[instruction()]
pub struct ChangeLockPercent<'info> {
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

