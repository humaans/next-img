import React from 'react'
import Link from 'next/link'

export function Layout({ children }) {
  return (
    <div>
      <div className='header'>
        <div className='header-inner'>
          <div>
            <Link href='/'>
              <a>
                <img
                  src='https://user-images.githubusercontent.com/324440/84085849-5f9a4100-a9de-11ea-94c4-bbfbdc8a0a16.png'
                  alt='next-img'
                  title='next-img'
                  width='200'
                />
              </a>
            </Link>
          </div>

          <ul className='nav'>
            <li>
              <Link href='/'>
                <a>Intro</a>
              </Link>
            </li>
            <li>
              <Link href='/usage'>
                <a>Usage</a>
              </Link>
            </li>
            <li>
              <Link href='/reference'>
                <a>Reference</a>
              </Link>
            </li>
            <li>
              <Link href='/examples'>
                <a>Examples</a>
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div class='content'>{children}</div>
      <style jsx>{`
        .header {
          background: #f9f7f0;
          border-bottom: 1px solid #382fc510;
        }

        .header-inner {
          max-width: 780px;
          margin: auto;
          padding: 20px 0;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
        }

        .nav {
          list-style: none;
          display: flex;
          flex-direction: row;
          justify-content: flex-end;
          padding: 0;
        }

        .nav a {
          display: block;
          padding: 8px 20px;
          text-decoration: none;
          border-radius: 4px;
          transition: all 200ms;
          color: #382fc5;
        }

        .nav a:hover {
          background: #382fc510;
        }
      `}</style>
    </div>
  )
}
