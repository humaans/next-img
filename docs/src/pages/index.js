import React from 'react'
import { Picture } from 'next-img'
import { Layout } from '../components/Layout'
import { toString } from '../helpers/toString'
import Code from 'react-syntax-highlighter'
import syntax from 'react-syntax-highlighter/dist/cjs/styles/hljs/railscasts'

export default () => (
  <Layout>
    <div className='example'>
      <div className='example-inner'>
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

    <div className='example example-1' id='example-1'>
      <div className='example-inner'>
        <aside>Example 1</aside>
        <h2>One size per breakpoint</h2>
        <p>
          The most typical usage. Provide one image per each device size you're targeting. For example, if you're
          targeting small/large at 768px breakpoint (as configured in your <code>next.config.js</code>), provide 2
          sizes. If you're targeting mobile/tablet/desktop with breakpoints 480px and 768px (as configured in your{' '}
          <code>next.config.js</code>) - provide 3 sizes, and so on.
        </p>

        <Code language='html' style={syntax}>
          {`<Picture src={require('../images/coffee1.jpg?sizes=375,860')} />`}
        </Code>
        <h3>Output</h3>
        <Code language='html' style={syntax}>
          {toString(<Picture src={require('../images/coffee1.jpg?sizes=375,860')} />)}
        </Code>
        <div className='photo'>
          <div className='photo-inner'>
            <Picture src={require('../images/coffee1.jpg?sizes=375,860')} />
          </div>
        </div>
      </div>
    </div>

    <div className='example example-2' id='example-2'>
      <div className='example-inner'>
        <aside>Example 2</aside>
        <h2>Override breakpoints</h2>
        <p>
          You can specify a different set of breakpoints for an individual image. Let's say your preconfigured
          breakpoints are <code>[768]</code>, but for some image you want to use 3 sizes at breakpoints{' '}
          <code>[768, 1080]</code>.
        </p>

        <Code language='html' style={syntax}>
          {`<Picture
  src={require('../images/coffee2.jpg?sizes=375,600,860')}
  breakpoints={[768,1080]}
/>`}
        </Code>
        <h3>Output</h3>
        <Code language='html' style={syntax}>
          {toString(<Picture src={require('../images/coffee2.jpg?sizes=375,600,860')} breakpoints={[768, 1080]} />)}
        </Code>
        <div className='photo'>
          <div className='photo-inner'>
            <Picture src={require('../images/coffee2.jpg?sizes=375,600,860')} breakpoints={[768, 1080]} />
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
          prop in order to get full control over specifying which image should be used at what breakpoint. This way you
          can specify any number of image sizes and choose to show them at any breakpoint.
        </p>

        <Code language='html' style={syntax}>
          {`<Picture
  src={require('../images/coffee3.jpg?sizes=375,600,860')}
  sizes='(max-width: 768px) 100vw, (max-width: 1180px) 600px, 860px'
/>`}
        </Code>
        <h3>Output</h3>
        <Code language='html' style={syntax}>
          {toString(
            <Picture
              src={require('../images/coffee3.jpg?sizes=375,600,860')}
              sizes='(max-width: 768px) 100vw, (max-width: 1180px) 600px, 860px'
            />,
          )}
        </Code>
        <div className='photo'>
          <div className='photo-inner'>
            <Picture
              src={require('../images/coffee3.jpg?sizes=375,600,860')}
              sizes='(max-width: 768px) 100vw, (max-width: 1180px) 600px, 860px'
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
          You can leave out the <code>sizes</code> query param altogether. That will load the original image size across
          any device width. Note, this still outputs an image per screen density and shows the appropriate one based on
          the device.
        </p>

        <Code language='html' style={syntax}>
          {`<Picture src={require('../images/coffee4.jpg')} />`}
        </Code>
        <h3>Output</h3>
        <Code language='html' style={syntax}>
          {toString(<Picture src={require('../images/coffee4.jpg')} />)}
        </Code>
        <div className='photo'>
          <div className='photo-inner'>
            <Picture src={require('../images/coffee4.jpg')} />
          </div>
        </div>
      </div>
    </div>

    <div className='example example-5' id='example-5'>
      <div className='example-inner'>
        <aside>Example 5</aside>
        <h2>Art direction</h2>
        <p>
          You can pass an array of images to the src. This way you can show an entirely different image at each
          breakpoint. This changes the html output to switch between the images using the html{' '}
          <a
            href='https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images#Art_direction'
            target='blank_'
          >
            media attribute
          </a>
          . Note, you can take this even further by specifying multiple sizes for each image and using the{' '}
          <a
            href='https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images#Resolution_switching_Different_sizes'
            target='blank_'
          >
            sizes prop
          </a>
          to specify what should be shown when.
        </p>

        <Code language='html' style={syntax}>
          {`<Picture
  src={[
    require('../images/coffee5-s.jpg?sizes=375'),
    require('../images/coffee5-m.jpg?sizes=600'),
    require('../images/coffee5-l.jpg?sizes=860'),
  ]}
  breakpoints={[768, 1180]}
/>`}
        </Code>
        <h3>Output</h3>
        <Code language='html' style={syntax}>
          {toString(
            <Picture
              src={[
                require('../images/coffee5-s.jpg?sizes=375'),
                require('../images/coffee5-m.jpg?sizes=600'),
                require('../images/coffee5-l.jpg?sizes=860'),
              ]}
              breakpoints={[768, 1180]}
            />,
          )}
        </Code>
        <div className='photo'>
          <div className='photo-inner'>
            <Picture
              src={[
                require('../images/coffee5-s.jpg?sizes=375'),
                require('../images/coffee5-m.jpg?sizes=600'),
                require('../images/coffee5-l.jpg?sizes=860'),
              ]}
              breakpoints={[768, 1180]}
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
          By default, every image gets translated to 1x and 2x densities. That is, if you display the image in the
          browser at 800px width, then specifying <code>?sizes=800</code> will produce and show 800px wide image for low
          density devices and 1600px wide image for high density devices. If you'd like, however, you can specify any
          number of exact sizes by setting densities to 1x.
        </p>

        <Code language='html' style={syntax}>
          {`<Picture src={require('../images/coffee6.jpg?sizes=300,600,900,1200,1500&densities=1x')} sizes='100vw' />`}
        </Code>
        <h3>Output</h3>
        <Code language='html' style={syntax}>
          {toString(
            <Picture src={require('../images/coffee6.jpg?sizes=300,600,900,1200,1500&densities=1x')} sizes='100vw' />,
          )}
        </Code>
        <div className='photo'>
          <div className='photo-inner'>
            <Picture src={require('../images/coffee6.jpg?sizes=300,600,900,1200,1500&densities=1x')} sizes='100vw' />
          </div>
        </div>
      </div>
    </div>

    <div className='example example-7' id='example-7'>
      <div className='example-inner'>
        <aside>Example 7</aside>
        <h2>PNG images</h2>
        <p>PNG images are supported as well. In this case, a lossless webp is outputted by default.</p>

        <Code language='html' style={syntax}>
          {`<Picture src={require('../images/illustration.png?sizes=480,860')} />`}
        </Code>
        <h3>Output</h3>
        <Code language='html' style={syntax}>
          {toString(<Picture src={require('../images/illustration.png?sizes=480,860')} />)}
        </Code>
        <div className='photo'>
          <div className='photo-inner'>
            <Picture src={require('../images/illustration.png?sizes=480,860')} />
          </div>
        </div>
      </div>
    </div>

    <div className='example example-8' id='example-8'>
      <div className='example-inner'>
        <aside>Example 8</aside>
        <h2>Other query params and component props</h2>
        <p>
          You can control image quality and densities in addition to specifying the sizes when importing an image. See{' '}
          <a href='https://github.com/humaans/next-img/'>README</a> for full details. You can pass extra props to the{' '}
          <code>Picture</code> component, these will be forwarded to the underlying image element. This is useful for
          adding lazy loading, class names, and so on.
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

      .toc {
        padding: 24px;
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
