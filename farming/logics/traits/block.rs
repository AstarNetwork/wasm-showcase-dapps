use openbrush::traits::BlockNumber;

pub trait BlockInfo {
    fn block_number(&self) -> BlockNumber;
}
