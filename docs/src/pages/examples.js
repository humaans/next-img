import React from 'react'
import { Layout } from '../components/Layout'
import Examples from '../content/examples.mdx'

export default () => (
  <Layout>
    <div className='row'>
      <div className='container'>
        <Examples />
      </div>
    </div>

    <style jsx>{`
      .container {
        max-width: 780px;
        margin: auto;
      }

      .intro {
        background: #f9f7f0;
        padding-bottom: 80px;
      }

      .row {
        padding: 80px auto 40px;
        width: 100%;
      }
    `}</style>
  </Layout>
)
