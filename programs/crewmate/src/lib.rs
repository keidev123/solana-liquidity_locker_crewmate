use anchor_lang::prelude::*;

pub mod state;

pub mod constant;

pub mod errors;

pub mod instructions;

use crate::instructions::*;

declare_id!("s1xY9GbteSddorsie2y265Qg56QXa45C6NVAaxb56wV");

#[program]
pub mod crewmate {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
			initialize::handle(ctx)
		}

		pub fn lock(ctx: Context<Lock>, seed: u64, lock_amount: u64, lock_duration: u64) -> Result<()> {
			lock::handle(ctx, seed, lock_amount, lock_duration)
		}

		pub fn withdraw(ctx: Context<Withdraw>, seed: u64, bump: u8) -> Result<()> {
			withdraw::handle(ctx, seed, bump)
		}

		pub fn increase_lock_amount(ctx: Context<IncreaseLockAmount>, seed: u64, amount: u64) -> Result<()> {
			increase_amount::handle(ctx, seed, amount)
		}

		pub fn increase_lock_time(ctx: Context<IncreaseLockPeriod>, seed: u64, duration: u64) -> Result<()> {
			increase_duration::handle(ctx, seed, duration)
		}

		pub fn change_admin(ctx: Context<ChangeAdmin>, new_admin: Pubkey) -> Result<()> {
			change_admin::handle(ctx, new_admin)
		}

		pub fn change_lock_percent(ctx: Context<ChangeLockPercent>, new_amount: u64) -> Result<()> {
			change_lock_percent::handle(ctx, new_amount)
		}

		pub fn change_lock_period(ctx: Context<ChangeLockPeriod>, new_period: u64) -> Result<()> {
			change_lock_period::handle(ctx, new_period)
		}
		
}
