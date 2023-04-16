import React from 'react'
import Link from 'next/link'

export function Layout({ children }) {
  return (
    <div>
      <div className='header'>
        <div className='header-inner'>
          <div>
            <Link href='/' legacyBehavior>
              <a className='logo'>next-img</a>
            </Link>
          </div>

          <ul className='nav'>
            <li>
              <Link href='https://github.com/humaans/next-img/' legacyBehavior>
                <a>View on Github →</a>
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className='content'>{children}</div>
      <style jsx>{`
        .header {
          border-bottom: 1px solid #dec79b40;
        }

        .header-inner {
          max-width: 1080px;
          margin: auto;
          padding: 20px 20px;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
        }

        @media (min-width: 768px) {
          .header-inner {
            padding: 20px 40px;
          }
        }

        .logo {
          color: #dec79b;
          font-size: 28px;
          font-weight: 800;
          text-decoration: none;
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
          color: white;
        }

        .nav a:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  )
}
