import React from 'react'
import { Picture } from 'next-img'
import { Layout } from '../components/Layout'
import { toString } from '../helpers/toString'
import Code from 'react-syntax-highlighter'
import syntax from 'react-syntax-highlighter/dist/cjs/styles/hljs/railscasts'

export default function Index() {
  return (
    <Layout>
      <div className='example'>
        <div className='example-inner tocs'>
          <div>
            <h3 className='toc-heading'>Next.js plugin for embedding optimized images.</h3>
            <ul className='toc'>
              <li>
                <strong>import</strong> JPEG, PNG, WebP, and AVIF images
              </li>
              <li>
                <strong>output</strong> to WebP and optional AVIF
              </li>
              <li>
                <strong>resize</strong> to multiple screen sizes and densities
              </li>
              <li>
                <strong>optimize</strong> WebP and fallback images using Sharp
              </li>
              <li>
                <strong>preload and lazy load</strong> with modern browser hints
              </li>
              <li>
                <strong>prevent layout shift</strong> with automatic width/height attributes
              </li>
              <li>
                <strong>streamlined usage</strong>
                {` with the built in <Picture /> component`}
              </li>
              <li>
                <strong>art direction</strong> with different images for different breakpoints
              </li>
              <li>
                <strong>fast</strong> deployment and development workflow using persistent cache
              </li>
            </ul>
          </div>
          <div>
            <h3 className='toc-heading'>Examples</h3>
            <ol className='toc'>
              <li>
                <a href='#example-1'>One size per breakpoint</a>
              </li>
              <li>
                <a href='#example-2'>Override breakpoints</a>
              </li>
              <li>
                <a href='#example-3'>Override sizes attribute</a>
              </li>
              <li>
                <a href='#example-4'>Single image</a>
              </li>
              <li>
                <a href='#example-5'>Art direction</a>
              </li>
              <li>
                <a href='#example-6'>Exact image sizes</a>
              </li>
              <li>
                <a href='#example-7'>PNG images</a>
              </li>
              <li>
                <a href='#example-8'>Other query params and component props</a>
              </li>
            </ol>
          </div>
        </div>
      </div>

      <div className='example example-1' id='example-1'>
        <div className='example-inner'>
          <aside>Example 1</aside>
          <h2>One size per breakpoint</h2>
          <p>
            The legacy <code>sizes</code> query creates one logical image size per configured breakpoint. Each size is
            combined with the configured pixel densities, which default to 1x and 2x.
          </p>

          <Code language='html' style={syntax}>
            {`<Picture src={require('../images/coffee1.jpg?sizes=375,860&formats=avif,webp')} alt='Coffee' preload />`}
          </Code>
          <h3>Output</h3>
          <Code language='html' style={syntax}>
            {toString(
              <Picture src={require('../images/coffee1.jpg?sizes=375,860&formats=avif,webp')} alt='Coffee' preload />,
            )}
          </Code>
          <div className='photo'>
            <div className='photo-inner'>
              <Picture src={require('../images/coffee1.jpg?sizes=375,860&formats=avif,webp')} alt='Coffee' preload />
            </div>
          </div>
        </div>
      </div>

      <div className='example example-2' id='example-2'>
        <div className='example-inner'>
          <aside>Example 2</aside>
          <h2>Override breakpoints</h2>
          <p>
            Override the configured breakpoints for one image. This example maps three logical sizes to breakpoints at{' '}
            <code>768px</code> and <code>1080px</code>.
          </p>

          <Code language='html' style={syntax}>
            {`<Picture
  src={require('../images/coffee2.jpg?sizes=375,600,860')}
  breakpoints={[768,1080]}
  alt='Coffee'
/>`}
          </Code>
          <h3>Output</h3>
          <Code language='html' style={syntax}>
            {toString(
              <Picture
                src={require('../images/coffee2.jpg?sizes=375,600,860')}
                breakpoints={[768, 1080]}
                alt='Coffee'
              />,
            )}
          </Code>
          <div className='photo'>
            <div className='photo-inner'>
              <Picture
                src={require('../images/coffee2.jpg?sizes=375,600,860')}
                breakpoints={[768, 1080]}
                alt='Coffee'
              />
            </div>
          </div>
        </div>
      </div>

      <div className='example example-3' id='example-3'>
        <div className='example-inner'>
          <aside>Example 3</aside>
          <h2>Override sizes attribute</h2>
          <p>
            Use the{' '}
            <a
              href='https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images#Resolution_switching_Different_sizes'
              target='blank_'
            >
              sizes
            </a>{' '}
            prop to tell the browser how wide the image will render at each breakpoint.
          </p>

          <Code language='html' style={syntax}>
            {`<Picture
  src={require('../images/coffee3.jpg?sizes=375,600,860')}
  sizes='(max-width: 768px) 100vw, (max-width: 1180px) 600px, 860px'
  alt='Coffee'
/>`}
          </Code>
          <h3>Output</h3>
          <Code language='html' style={syntax}>
            {toString(
              <Picture
                src={require('../images/coffee3.jpg?sizes=375,600,860')}
                sizes='(max-width: 768px) 100vw, (max-width: 1180px) 600px, 860px'
                alt='Coffee'
              />,
            )}
          </Code>
          <div className='photo'>
            <div className='photo-inner'>
              <Picture
                src={require('../images/coffee3.jpg?sizes=375,600,860')}
                sizes='(max-width: 768px) 100vw, (max-width: 1180px) 600px, 860px'
                alt='Coffee'
              />
            </div>
          </div>
        </div>
      </div>

      <div className='example example-4' id='example-4'>
        <div className='example-inner'>
          <aside>Example 4</aside>
          <h2>Single image</h2>
          <p>
            Without <code>sizes</code> or <code>widths</code>, next-img keeps the source dimensions and emits one
            candidate per format. Large bare imports warn by default; use responsive widths for content images.
          </p>

          <Code language='html' style={syntax}>
            {`<Picture src={require('../images/coffee4.jpg')} alt='Coffee' />`}
          </Code>
          <h3>Output</h3>
          <Code language='html' style={syntax}>
            {toString(<Picture src={require('../images/coffee4.jpg')} alt='Coffee' />)}
          </Code>
          <div className='photo'>
            <div className='photo-inner'>
              <Picture src={require('../images/coffee4.jpg')} alt='Coffee' />
            </div>
          </div>
        </div>
      </div>

      <div className='example example-5' id='example-5'>
        <div className='example-inner'>
          <aside>Example 5</aside>
          <h2>Art direction</h2>
          <p>
            Use <code>sources</code> to show a different crop or image at each breakpoint. Each conditional source has a{' '}
            <a
              href='https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images#Art_direction'
              target='blank_'
            >
              media attribute
            </a>
            ; the final unconditional source is the fallback.
          </p>

          <Code language='html' style={syntax}>
            {`<Picture
  sources={[
    { src: require('../images/coffee5-s.jpg?sizes=375'), media: '(max-width: 768px)' },
    { src: require('../images/coffee5-m.jpg?sizes=600'), media: '(max-width: 1180px)' },
    { src: require('../images/coffee5-l.jpg?sizes=860') },
  ]}
  alt='Coffee'
/>`}
          </Code>
          <h3>Output</h3>
          <Code language='html' style={syntax}>
            {toString(
              <Picture
                sources={[
                  { src: require('../images/coffee5-s.jpg?sizes=375'), media: '(max-width: 768px)' },
                  { src: require('../images/coffee5-m.jpg?sizes=600'), media: '(max-width: 1180px)' },
                  { src: require('../images/coffee5-l.jpg?sizes=860') },
                ]}
                alt='Coffee'
              />,
            )}
          </Code>
          <div className='photo'>
            <div className='photo-inner'>
              <Picture
                sources={[
                  { src: require('../images/coffee5-s.jpg?sizes=375'), media: '(max-width: 768px)' },
                  { src: require('../images/coffee5-m.jpg?sizes=600'), media: '(max-width: 1180px)' },
                  { src: require('../images/coffee5-l.jpg?sizes=860') },
                ]}
                alt='Coffee'
              />
            </div>
          </div>
        </div>
      </div>

      <div className='example example-6' id='example-6'>
        <div className='example-inner'>
          <aside>Example 6</aside>
          <h2>Exact image sizes</h2>
          <p>
            Use <code>widths</code> to generate exact candidates, then use the HTML <code>sizes</code> prop to describe
            their rendered width.
          </p>

          <Code language='html' style={syntax}>
            {`<Picture src={require('../images/coffee6.jpg?widths=300,600,900,1200,1500')} sizes='100vw' alt='Coffee' />`}
          </Code>
          <h3>Output</h3>
          <Code language='html' style={syntax}>
            {toString(
              <Picture
                src={require('../images/coffee6.jpg?widths=300,600,900,1200,1500')}
                sizes='100vw'
                alt='Coffee'
              />,
            )}
          </Code>
          <div className='photo'>
            <div className='photo-inner'>
              <Picture src={require('../images/coffee6.jpg?widths=300,600,900,1200,1500')} sizes='100vw' alt='Coffee' />
            </div>
          </div>
        </div>
      </div>

      <div className='example example-7' id='example-7'>
        <div className='example-inner'>
          <aside>Example 7</aside>
          <h2>PNG images</h2>
          <p>PNG inputs produce lossless WebP plus a PNG fallback by default.</p>

          <Code language='html' style={syntax}>
            {`<Picture src={require('../images/illustration.png?sizes=480,860')} alt='Illustration' />`}
          </Code>
          <h3>Output</h3>
          <Code language='html' style={syntax}>
            {toString(<Picture src={require('../images/illustration.png?sizes=480,860')} alt='Illustration' />)}
          </Code>
          <div className='photo'>
            <div className='photo-inner'>
              <Picture src={require('../images/illustration.png?sizes=480,860')} alt='Illustration' />
            </div>
          </div>
        </div>
      </div>

      <div className='example example-8' id='example-8'>
        <div className='example-inner'>
          <aside>Example 8</aside>
          <h2>Other query params and component props</h2>
          <p>
            Query parameters control image processing. Other <code>Picture</code> props are forwarded to the underlying{' '}
            <code>img</code>. See the <a href='https://github.com/humaans/next-img/'>README</a> for the full API.
          </p>

          <Code language='html' style={syntax}>
            {`<Picture
  src={require('../images/coffee7.jpg?sizes=375,860&jpeg[quality]=10&jpeg[webp][quality]=10')}
  className='coffee'
  data-demo='coffee'
  alt='Three cups of coffee with different amounts of milk'
  loading='lazy'
/>`}
          </Code>
          <h3>Output</h3>
          <Code language='html' style={syntax}>
            {toString(
              <Picture
                src={require('../images/coffee7.jpg?sizes=375,860&jpeg[quality]=10&jpeg[webp][quality]=10')}
                className='coffee'
                data-demo='coffee'
                alt='Three cups of coffee with different amounts of milk'
                loading='lazy'
              />,
            )}
          </Code>
          <div className='photo'>
            <div className='photo-inner'>
              <Picture
                src={require('../images/coffee7.jpg?sizes=375,860&jpeg[quality]=10&jpeg[webp][quality]=10')}
                className='coffee'
                data-demo='coffee'
                alt='Three cups of coffee with different amounts of milk'
                loading='lazy'
              />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        aside {
          margin-top: 3rem;
          font-weight: 900;
          text-transform: uppercase;
        }

        h2 {
          margin-top: 1rem;
          font-size: 2rem;
        }

        .tocs {
          display: flex;
          flex-direction: column;
        }

        @media (min-width: 768px) {
          .tocs {
            flex-direction: row;
          }
        }

        .tocs > div:first-child {
          flex: 1.5;
        }

        .tocs > div:last-child {
          flex: 1;
        }

        .toc-heading {
        }

        .toc {
          padding: 24px;
          padding-top: 0;
        }

        .example {
          padding: 20px;
          border-bottom: 1px solid #dec79b40;
        }

        @media (min-width: 768px) {
          .example {
            padding: 40px;
          }
        }

        .example-inner {
          max-width: 1080px;
          margin: auto;
        }

        .photo {
          background: rgb(35, 35, 35);
          padding: 20px;
        }

        @media (min-width: 768px) {
          .photo {
            padding: 80px 20px;
          }
        }

        .photo-inner {
          max-width: 860px;
          margin: auto;
        }

        .example-1 .photo-inner {
          max-width: 860px;
        }

        .example-2 .photo-inner {
          max-width: 600px;
        }

        @media (min-width: 1180px) {
          .example-2 .photo-inner {
            max-width: 860px;
          }
        }

        .example-3 .photo-inner {
          max-width: 600px;
        }

        @media (min-width: 1180px) {
          .example-3 .photo-inner {
            max-width: 860px;
          }
        }

        .example-5 .photo-inner {
          max-width: 600px;
        }

        @media (min-width: 1180px) {
          .example-5 .photo-inner {
            max-width: 860px;
          }
        }
      `}</style>
    </Layout>
  )
}
