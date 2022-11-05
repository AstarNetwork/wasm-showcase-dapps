import { useEffect, useState } from 'react';

const SampleContractsList = (): JSX.Element => {
  
  const navigation = {
    shiden: [
      { name: 'PSP34Sample', address: 'none' },
    ],
    shibuya: [
      { name: 'PSP34Sample', address: 'aiEWySrv4ufr8NZUvFSWd2Gt7Nn3S6LS1JYieuP1t1ckLz2' },
    ],
  };

  const [localContract, setLocalContract] = useState('');
  const [customContract, setCustomContract] = useState('');

  useEffect(() => {
    const localContract: any = localStorage.getItem('localContract');
    setLocalContract(localContract);
    const customContract: any = localStorage.getItem('customContract');
    setCustomContract(customContract);
  },[]);

  const saveLocalContract = (contract: string) => {
    setLocalContract(contract);
    localStorage.setItem('localContract', contract);
  };
  const saveCustomContract = (contract: string) => {
    setCustomContract(contract);
    localStorage.setItem('customContract', contract);
  };

  return (
    <div className="text-left max-w-6xl p-2 m-auto mt-5 w-11/12 border-[#d8d2c5] dark:border-[#323943] bg-[#f4efe2] dark:bg-[#121923] border border-1 rounded">
      <h3 className="m-1 text-xl text-center">Sample Contracts</h3>
      <dl role="list" className="m-1 break-all">
        <dt className="m-1 text-xl">Shiden</dt>
        {navigation.shiden.map((item) => (
          <dd className="ml-4" key={item.name}>{item.name}: {item.address}</dd>
        ))}
      </dl>
      <dl role="list" className="mt-3 m-1 break-all">
        <dt className="m-1 text-xl">Shibuya</dt>
        {navigation.shibuya.map((item) => (
          <dd className="ml-4" key={item.name}>{item.name}: {item.address}</dd>
        ))}
      </dl>
      <dl role="list" className="mt-3 m-1 break-all">
        <dt className="m-1 text-xl">Local</dt>
        <dd className="ml-4">
        <input
            className="w-[480px] p-2 m-2 bg-[#dcd6c8] dark:bg-[#020913] border-2 border-[#95928b] dark:border-gray-500 rounded"
            onChange={(event) => saveLocalContract(event.target.value)}
            placeholder="Local contract address here"
            value={localContract}
        />
        </dd>
      </dl>
      <dl role="list" className="mt-3 m-1 break-all">
        <dt className="m-1 text-xl">Custom</dt>
        <dd className="ml-4">
        <input
            className="w-[480px] p-2 m-2 bg-[#dcd6c8] dark:bg-[#020913] border-2 border-[#95928b] dark:border-gray-500 rounded"
            onChange={(event) => saveCustomContract(event.target.value)}
            placeholder="Custom contract address here"
            value={customContract}
        />
        </dd>
      </dl>
    </div>
  );
};

export default SampleContractsList;