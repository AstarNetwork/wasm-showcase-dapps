use ink_env::CallFlags;
use ink_prelude::vec::Vec;
use openbrush::{
    contracts::psp22::{
        PSP22Error,
        PSP22Ref,
    },
    traits::{
        AccountId,
        Balance,
    },
};

#[macro_export]
macro_rules! ensure {
    ( $x:expr, $y:expr $(,)? ) => {{
        if !$x {
            return Err($y.into())
        }
    }};
}

#[inline]
pub fn transfer_from_with_reentrancy(
    token: AccountId,
    from: AccountId,
    to: AccountId,
    value: Balance,
) -> Result<(), PSP22Error> {
    PSP22Ref::transfer_from_builder(&token, from, to, value, Vec::new())
        .call_flags(CallFlags::default().set_allow_reentry(true))
        .fire()
        .unwrap()
}
