import React from 'react'
import { Layout } from '../components/Layout'
import Reference from '../content/reference.mdx'

export default () => (
  <Layout>
    <div className='intro'>
      <div className='container'>
        <Reference />
      </div>
    </div>

    <style jsx>{`
      .intro {
        background: #f9f7f0;
        padding: 160px 0;
      }

      .container {
        max-width: 780px;
        margin: auto;
      }
    `}</style>
  </Layout>
)
