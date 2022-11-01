import { NextPage } from 'next'
import dynamic from 'next/dynamic'

const Canvas = dynamic(() => import('../components/IndexCanvas'), {
  ssr: false,
  loading: () => <p className="h-screen w-screen flex justify-center items-center">Now Loading...</p>,
})

const IndexPage: NextPage = () => {
  return (
    <main className="bg-[#ffffff] dark:bg-[#0d1117] text-[#1d2127] dark:text-[#f0eee0]">
      <Canvas />
    </main>
  )
};

export default IndexPage;