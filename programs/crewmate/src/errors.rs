use anchor_lang::prelude::*;

#[error_code]
pub enum CustomErrors {
    #[msg("Math operation overflow")]
    MathOverflow,

    #[msg("Lp token lock amount is smaller than minimum")]
    SmallLpLockAmount,

    #[msg("Lp token lock period is shorter than minimum")]
    ShorterLockDuration,

    #[msg("Lock period is not ended yet")]
    LockPeriodNotEnded,

    #[msg("Insufficient token balance in vault")]
    InsufficientToken,

    #[msg("Token vault has no token")]
    NoTokenInVault,

    #[msg("LP token already withdrawn")]
    AlreadyWithdrawn,

    #[msg("Pool ID doesn't match with stored user pool ID")]
    InvalidPool,

    #[msg("Liquidity token is already withdrawn")]
    LpAlreadyWithdrawn,

    #[msg("Lock amount is more than")]
    LockMoreThanSupply,

    #[msg("Lock position does not match the derived address")]
    InvalidLock,

    #[msg("Lock extend period too short (at least 1/2 day)")]
    ShortExtendTime,

    #[msg("Incorrect Admin")]
    InvalidAdmin,

    #[msg("Change lock period too short")]
    InvalidPeriod,

    #[msg("Change lock amount in percent invalid")]
    InvalidAmount
}
