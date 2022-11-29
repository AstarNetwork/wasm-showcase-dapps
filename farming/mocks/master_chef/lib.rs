#![cfg_attr(not(feature = "std"), no_std)]
#![feature(min_specialization)]

#[openbrush::contract]
pub mod master_chef_mock {
    use farming::traits::{master_chef::{
        events::*,
        farming::*,
        getters::*,
    }, block::BlockInfo};
    use ink_lang::codegen::{
        EmitEvent,
        Env,
    };
    use ink_storage::traits::SpreadAllocate;
    use openbrush::{
        contracts::{
            ownable,
            ownable::Internal,
        },
        traits::Storage,
    };

    #[ink(event)]
    pub struct Deposit {
        #[ink(topic)]
        pub user: AccountId,
        #[ink(topic)]
        pub pool_id: u32,
        pub amount: Balance,
        #[ink(topic)]
        pub to: AccountId,
    }

    #[ink(event)]
    pub struct Withdraw{
        #[ink(topic)]
        pub user: AccountId,
        #[ink(topic)]
        pub pool_id: u32,
        pub amount: Balance,
        #[ink(topic)]
        pub to: AccountId,
    }

    #[ink(event)]
    pub struct EmergencyWithdraw {
        #[ink(topic)]
        pub user: AccountId,
        #[ink(topic)]
        pub pool_id: u32,
        pub amount: Balance,
        #[ink(topic)]
        pub to: AccountId,
    }

    #[ink(event)]
    pub struct Harvest {
        #[ink(topic)]
        pub user: AccountId,
        #[ink(topic)]
        pub pool_id: u32,
        pub amount: Balance,
    }

    #[ink(event)]
    pub struct LogPoolAddition {
        #[ink(topic)]
        pub pool_id: u32,
        pub alloc_point: u32,
        #[ink(topic)]
        pub lp_token: AccountId,
        #[ink(topic)]
        pub rewarder: Option<AccountId>,
    }

    #[ink(event)]
    pub struct LogSetPool {
        #[ink(topic)]
        pub pool_id: u32,
        pub alloc_point: u32,
        #[ink(topic)]
        pub rewarder: Option<AccountId>,
        pub overwrite: bool,
    }

    #[ink(event)]
    pub struct LogUpdatePool{
        #[ink(topic)]
        pub pool_id: u32,
        pub last_reward_block: BlockNumber,
        pub lp_supply: Balance,
        pub acc_arsw_per_share: Balance,
    }

    #[ink(event)]
    pub struct DepositARSW {
        pub block_number: BlockNumber,
        pub amount: Balance
    }

    #[ink(storage)]
    #[derive(Default, SpreadAllocate, Storage)]
    pub struct FarmingContract {
        #[storage_field]
        farming: Data,
        #[storage_field]
        ownable: ownable::Data,
        block_number: BlockNumber,
    }

    impl Farming for FarmingContract {}

    impl BlockInfo for FarmingContract {
        fn block_number(&self) -> BlockNumber {
            self.block_number
        }
    }

    impl FarmingGetters for FarmingContract {}

    impl FarmingEvents for FarmingContract {
        fn _emit_deposit_event(
            &self,
            user: AccountId,
            pool_id: u32,
            amount: Balance,
            to: AccountId,
        ) {
            self.env().emit_event(Deposit {
                user,
                pool_id,
                amount,
                to,
            })
        }

        fn _emit_withdraw_event(
            &self,
            user: AccountId,
            pool_id: u32,
            amount: Balance,
            to: AccountId,
        ) {
            self.env().emit_event(Withdraw {
                user,
                pool_id,
                amount,
                to
            })
        }

        fn _emit_emergency_withdraw_event(
            &self,
            user: AccountId,
            pool_id: u32,
            amount: Balance,
            to: AccountId,
        ) {
            self.env().emit_event(EmergencyWithdraw {
                user,
                pool_id,
                amount,
                to,
            })
        }

        fn _emit_harvest_event(&self, user: AccountId, pool_id: u32, amount: Balance) {
            self.env().emit_event(Harvest {
                user,
                pool_id,
                amount,
            })
        }

        fn _emit_log_pool_addition_event(
            &self,
            pool_id: u32,
            alloc_point: u32,
            lp_token: AccountId,
            rewarder: Option<AccountId>,
        ) {
            self.env().emit_event(LogPoolAddition {
                pool_id,
                alloc_point,
                lp_token,
                rewarder,
            })
        }

        fn _emit_log_set_pool_event(
            &self,
            pool_id: u32,
            alloc_point: u32,
            rewarder: Option<AccountId>,
            overwrite: bool,
        ) {
            self.env().emit_event(LogSetPool {
                pool_id,
                alloc_point,
                rewarder,
                overwrite,
            })
        }

        fn _emit_log_update_pool_event(
            &self,
            pool_id: u32,
            last_reward_block: u32,
            lp_supply: Balance,
            acc_arsw_per_share: Balance,
        ) {
            self.env().emit_event(LogUpdatePool {
                pool_id,
                last_reward_block,
                lp_supply,
                acc_arsw_per_share,
            })

        }

        fn _emit_deposit_arsw_event(&self, block_number: u32, amount: Balance) {
            self.env().emit_event(DepositARSW {
                block_number,
                amount,
            })
        }
    }

    impl FarmingContract {
        #[ink(constructor)]
        pub fn new(arsw_token: AccountId) -> Self {
            ink_lang::codegen::initialize_contract(|instance: &mut Self| {
                let caller = instance.env().caller();
                instance._init_with_owner(caller);
                instance.farming.arsw_token = arsw_token;
                instance.farming.farming_origin_block = Self::env().block_number();
                instance.block_number = Self::env().block_number();
            })
        }
        #[ink(message)]
        pub fn increase_block_number(&mut self, offset: BlockNumber) {
            self.block_number += offset
        }
        #[ink(message)]
        pub fn get_block_number(&self) -> BlockNumber {
            self.block_number()
        }
    }
}
