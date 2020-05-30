import React from 'react'
import ReactDOMServer from 'react-dom/server'
import { html as pretty } from 'js-beautify'
import Code from 'react-syntax-highlighter'
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs'
import { Picture } from '../..'

function log(imp) {
  if (typeof window !== 'undefined') {
    console.log(imp)
  }
  return imp
}

const exampleCode = [
  `<Picture src={require('./images/jelly.jpg')} />`,
  `<Picture src={require('./images/jelly.jpg?sizes=200,800')} />`,
  `<Picture src={require('./images/jelly.jpg?sizes=200,800,1200')} sizes='(max-width: 768px) 100vw, 50vw' />`,
  `<Picture
  src={[
    require('./images/jelly-s.jpg?sizes=100,375'),
    require('./images/jelly-m.jpg?sizes=600'),
    require('./images/jelly-l.jpg?sizes=800,1200,1600')
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
/>`,
  `<Picture key={0} src={log(require('./images/alien.png?sizes=480,800'))} loading='lazy' />`,
]
const examples = [
  <Picture key={0} src={log(require('./images/jelly.jpg'))} loading='lazy' />,
  <Picture key={1} src={require('./images/jelly.jpg?sizes=200,800')} loading='lazy' />,
  <Picture
    key={2}
    src={require('./images/jelly.jpg?sizes=200,800,1200')}
    sizes='(max-width: 768px) 100vw, 50vw'
    loading='lazy'
  />,
  <Picture
    key={3}
    src={[
      require('./images/jelly-s.jpg?sizes=100,375'),
      require('./images/jelly-m.jpg?sizes=600'),
      require('./images/jelly-l.jpg?sizes=800,1200,1600'),
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
  <Picture key={0} src={log(require('./images/alien.png?sizes=480,800'))} loading='lazy' />,
]

export default () => (
  <div className='container'>
    <link
      href='https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500;600&display=swap'
      rel='stylesheet'
    />

    <div className='row'>
      <h1>next-img</h1>
    </div>

    <div className='row'>
      <p>A plugin for Next.js for resizing, modernizing, optimizing and embedding images.</p>
      <br />
      <p>Features:</p>
      <ul>
        <li>Import jpg and png images</li>
        <li>
          Resize to multiple output sizes (using <strong>sharp</strong>)
        </li>
        <li>Resize to preconfigured pixel densities</li>
        <li>Output both original and webp image formats</li>
        <li>Optimize jpg, png and webp images to specified quality</li>
        <li>
          Built in <code>{`<Picture>`}</code> component for embedding images with ease
        </li>
        <li>No dependencies on existing webpack loaders, making usage and configuration streamlined</li>
      </ul>
      <br />
      <p>
        By default <strong>next-img</strong> is configured with:
      </p>
      <ul>
        <li>
          1 breakpoint at <strong>768px</strong>
        </li>
        <li>
          3 pixel densities of <strong>1x</strong>, <strong>2x</strong> and <strong>3x</strong>
        </li>
        <li>
          output both the original format and <strong>webp</strong>
        </li>
      </ul>
      <p>All of those can be configured globally or per image.</p>
    </div>

    <div className='row'>
      <h2>Usage</h2>
      <p>
        The idea behind this plugin is to make it easy to embed images in your Next.js projects and serve them in an
        optimal fashion. That means:
      </p>
      <ul>
        <li>using webp format when supported</li>
        <li>resizing images to avoid serving oversized files</li>
        <li>running images through an optimizer</li>
      </ul>
      <p>There are 3 main workflows for using this plugin.</p>
      <p>
        The most common workflow is to import images and specify one size per each screen size (as specified by the
        breakpoints). The default breakpoint configuration is [768], meaning we intend, in the typical case, to serve
        one image size for mobile devices below 768px screen width and one image for any larger devices.
      </p>
      <p>For example:</p>
      <Code language='javascript' style={docco}>
        {`<Picture src={require('./images/jelly.jpg?sizes=375,800')} />`}
      </Code>
      <p>
        With this code, we will serve an image of width 375px (or 2x/3x larger depending on the screen density) on
        mobile devices and an image of 800px (or 2x/3x larger dependong in the screen density) on larger devices.
      </p>
      <p>
        If you globally configure more breakpoints (say you're using 480px, 768px and 1200px - in that case, you'd
        provide 4 image sizes, one for each breakpoint)
      </p>
      <p>Another workflow is to specify a different image per each breakpoint. This is the so called art direction.</p>
      <p>For example:</p>
      <Code language='javascript' style={docco}>
        {`<Picture
  src={[
    require('./images/jelly-s.jpg?sizes=375'),
    require('./images/jelly-l.jpg?sizes=800')
  ]}
/>`}
      </Code>
      <p>
        With this code, we will serve the <strong>jelly-s</strong> image on mobile devices and the{' '}
        <strong>jelly-l</strong> image on larger devices.
      </p>
      <p>
        The final workflow is for more advanced use cases where image sizes don't map 1-1 to breakpoints. In this way
        you can mix any number of different images and their sizes and use the{' '}
        <a
          href='https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images#How_do_you_create_responsive_images'
          target='_blank'
          rel='noopener noreferrer'
        >
          <strong>sizes</strong> attribute
        </a>{' '}
        to configure what should be shown when.
      </p>
      <p>For example:</p>
      <Code language='javascript' style={docco}>
        {`<Picture
  src={[
    require('./images/jelly-s.jpg?sizes=100,375'),
    require('./images/jelly-m.jpg?sizes=600'),
    require('./images/jelly-l.jpg?sizes=800,1200,1600')
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
      <p>
        Each of these examples and more can be seen below with more detail around the behaviour and the html output.
      </p>
    </div>

    <div className='row'>
      <h2>One size per breakpoint</h2>
      <p>The most typical expected usage when using this plugin.</p>
      <Code language='javascript' style={docco}>
        {exampleCode[1]}
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
      <Code language='html' style={docco}>
        {toString(examples[1])}
      </Code>
      {examples[1]}
    </div>

    <div className='row'>
      <h2>Basic usage</h2>
      <Code language='javascript' style={docco}>
        {exampleCode[0]}
      </Code>
      <h5>Behaviour</h5>
      <ul>
        <li>The image is served in the original size</li>
        <li>The image is compiled to webp</li>
        <li>Both the original and the webp images are optimized</li>
      </ul>
      <h5>Resulting HTML</h5>
      <Code language='html' style={docco}>
        {toString(examples[0])}
      </Code>
      {examples[0]}
    </div>

    <div className='row'>
      <h2>Use more sizes than there are breakpoints</h2>
      <Code language='javascript' style={docco}>
        {exampleCode[2]}
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
      <Code language='html' style={docco}>
        {toString(examples[2])}
      </Code>
      {examples[2]}
    </div>

    <div className='row'>
      <h2>Advanced usage - multiple images and multiple sizes</h2>
      <Code language='javascript' style={docco}>
        {exampleCode[3]}
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
      <Code language='html' style={docco}>
        {toString(examples[3])}
      </Code>
      {examples[3]}
    </div>

    <div className='row'>
      <h2>PNG image</h2>
      <Code language='javascript' style={docco}>
        {exampleCode[4]}
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
      <Code language='html' style={docco}>
        {toString(examples[4])}
      </Code>
      {examples[4]}
    </div>

    <style jsx>{`
      .container {
        font-family: system-ui, BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell,
          Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
      }

      a,
      a:visited {
        color: #07f;
      }

      .row {
        max-width: 980px;
        margin: 80px auto 40px;
      }

      :global(pre) {
        background: rgba(217, 232, 255, 0.2);
        padding: 12px 30px;
        overflow: auto;
        font-size: 14px;
        font-family: 'Source Code Pro', monospace;
        font-weight: 500;
      }

      :global(img) {
        max-width: 100%;
      }
    `}</style>
  </div>
)

function toString(element) {
  return pretty(ReactDOMServer.renderToStaticMarkup(element), {
    wrap_line_length: 40,
    wrap_attributes: 'force-expand-multiline',
    extra_liners: ['img'],
  })
    .replace(/, \//g, ',\n                /')
    .replace(/\/><\//g, '/>\n</')
}
