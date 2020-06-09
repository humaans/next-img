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
        <h1>Example 1</h1>
        <h2>One size per breakpoint</h2>
        <p>
          The most typical usage. Provide one image per each device size you're targeting. For example, if you're
          targeting small/large at 768px breakpoint, provide 2 images. If you're targeting mobile/tablet/desktop with
          breakpoints 480px and 768px - provide 3 images, and so on.
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

    <style jsx>{`
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
        max-width: 980px;
        margin: auto;
      }

      .photo {
        background: rgb(35, 35, 35);
        padding: 40px;
      }

      .photo-inner {
        max-width: 860px;
        margin: auto;
      }
    `}</style>
  </Layout>
)

/**

# Example 2 ## Use more sizes than there are
        breakpoints It's possible to provide more images than there are breakpoints. Howevever in this case, you'll have
        to specify the `size` prop when embedding the image in order for the extra sizes to be used. ### Code
        <Code language='javascript' style={syntax}>
          {`<Picture src={require('../images/jelly.jpg?sizes=375,1100,1400')} sizes='(max-width: 768px) 100vw, 50vw' />`}
        </Code>
        ### Output
        <Code language='html' style={syntax}>
          {toString(
            <Picture src={require('../images/jelly.jpg?sizes=375,1100,1400')} sizes='(max-width: 768px) 100vw, 50vw' />,
          )}
        </Code>
        ### Preview
        <Picture src={require('../images/jelly.jpg?sizes=375,1100,1400')} sizes='(max-width: 768px) 100vw, 50vw' />
        <div className='container'>
          <div className='row'>
            <h2>Example 1</h2>
            <h3>One size per breakpoint</h3>
            <p>The most typical expected usage when using this plugin.</p>
            <Code language='javascript' style={syntax}>
              {`<Picture src={require('../images/jelly.jpg?sizes=200,800')} />`}
            </Code>
            <h5>Behaviour</h5>
            <ul>
              <li>The image is resized to 1x, 2x and 3x density for each specified size</li>
              <li>This results in 200px, 400px, 600px, 800px, 1600px and 2400px sizes</li>
              <li>Each of those sizes is also converted to webp</li>
              <li>All images are optimized</li>
              <li>
                Each size is used within the breakpoints (default <code>breakpoints: [768]</code>)
              </li>
            </ul>
            <h5>Resulting HTML</h5>
            <Code language='html' style={syntax}>
              {toString(<Picture src={require('../images/jelly.jpg?sizes=200,800')} loading='lazy' />)}
            </Code>
            <Picture src={require('../images/jelly.jpg?sizes=200,800')} loading='lazy' />
          </div>

          <div className='row'>
            <h2>Basic usage</h2>
            <Code language='javascript' style={syntax}>
              {`<Picture src={require('../images/jelly.jpg')} />`}
            </Code>
            <h5>Behaviour</h5>
            <ul>
              <li>The image is served in the original size</li>
              <li>The image is compiled to webp</li>
              <li>Both the original and the webp images are optimized</li>
            </ul>
            <h5>Resulting HTML</h5>
            <Code language='html' style={syntax}>
              {toString(<Picture src={require('../images/jelly.jpg')} loading='lazy' />)}
            </Code>
            <Picture src={require('../images/jelly.jpg')} loading='lazy' />
          </div>

          <div className='row'>
            <h2>Advanced usage - multiple images and multiple sizes</h2>
            <Code language='javascript' style={syntax}>
              {`<Picture
  src={[
    require('../images/jelly-s.jpg?sizes=100,375'),
    require('../images/jelly-m.jpg?sizes=600'),
    require('../images/jelly-l.jpg?sizes=800,1200,1600')
  ]}
  breakpoints={[480, 768]}
  sizes={[
    // used for the first image
    \`(max-width: 300px) 100px,
      100vw\`,

    // used for the second image
    \`70vw\`,

    // used for the third image
    \`(max-width: 1200px) 800px,
      (max-width: 1600px) 1200px,
      80vw\`,
  ]}
/>`}
            </Code>
            <h5>Behaviour</h5>
            <ul>
              <li>The image is resized to 1x, 2x and 3x density for each specified size</li>
              <li>This results in 200px, 400px, 600px, 800px, 1600px, 2400px, 1200px and 3600px sizes</li>
              <li>Each of those sizes is also converted to webp</li>
              <li>All images are optimized</li>
              <li>Since there are more images than breakpoint divisions (2 by default) - sizes prop is required</li>
            </ul>
            <h5>Resulting HTML</h5>
            <Code language='html' style={syntax}>
              {toString(
                <Picture
                  src={[
                    require('../images/jelly-s.jpg?sizes=100,375'),
                    require('../images/jelly-m.jpg?sizes=600'),
                    require('../images/jelly-l.jpg?sizes=800,1200,1600'),
                  ]}
                  breakpoints={[480, 768]}
                  sizes={[
                    `(max-width: 300px) 100px,
      100vw`,
                    `70vw`,
                    `(max-width: 1200px) 800px,
      (max-width: 1600px) 1200px,
      80vw`,
                  ]}
                  loading='lazy'
                />,
              )}
            </Code>
            <Picture
              src={[
                require('../images/jelly-s.jpg?sizes=100,375'),
                require('../images/jelly-m.jpg?sizes=600'),
                require('../images/jelly-l.jpg?sizes=800,1200,1600'),
              ]}
              breakpoints={[480, 768]}
              sizes={[
                `(max-width: 300px) 100px,
      100vw`,
                `70vw`,
                `(max-width: 1200px) 800px,
      (max-width: 1600px) 1200px,
      80vw`,
              ]}
              loading='lazy'
            />
          </div>

          <div className='row'>
            <h2>PNG image</h2>
            <Code language='javascript' style={syntax}>
              {`<Picture key={0} src={require('../images/illustration.png?sizes=480,800')} loading='lazy' />`}
            </Code>
            <h5>Behaviour</h5>
            <ul>
              <li>The image is resized to 1x, 2x and 3x density for each specified size</li>
              <li>This results in 200px, 400px, 600px, 800px, 1600px, 2400px, 1200px and 3600px sizes</li>
              <li>Each of those sizes is also converted to webp</li>
              <li>All images are optimized</li>
              <li>Since there are more images than breakpoint divisions (2 by default) - sizes prop is required</li>
            </ul>
            <h5>Resulting HTML</h5>
            <Code language='html' style={syntax}>
              {toString(<Picture src={require('../images/illustration.png?sizes=480,800')} loading='lazy' />)}
            </Code>
            <Picture src={require('../images/illustration.png?sizes=480,800')} loading='lazy' />
          </div>
        </div>

 */
