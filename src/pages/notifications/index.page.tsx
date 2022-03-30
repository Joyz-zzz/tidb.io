// @ts-ignore
import Layout from './layout';
import React, { useState } from 'react';
import { Filter } from './layout/menu';
import Asktug from './Asktug.component';
import Blog from './Blog.component';
import Head from '~/components/head/Head.component';

const Page = ({ initIdx }) => {
  const [filter, setFilter] = useState<Filter>();
  const seoMetadata = {
    title: '通知',
  };
  return (
    <>
      <Head {...seoMetadata} />
      <Layout filter={filter} onFilterChange={setFilter} initIdx={initIdx}>
        {filter?.from === 'asktug' ? <Asktug filter={filter} /> : undefined}
        {/* prevent react cache */}
        <div />
        {filter?.from === 'blog' ? <Blog filter={filter} /> : undefined}
      </Layout>
    </>
  );
};

Page.getInitialProps = async (context) => {
  return {
    initIdx: context.query.from === 'blog' ? 4 : 0,
  };
};

export default Page;
