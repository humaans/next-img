const { makeMedia: media } = require('..')
const test = require('ava')

test('media queries', t => {
  let breakpoints = []
  t.is(media(0, [{ sizes: [200] }], breakpoints), undefined)

  breakpoints = [768]
  t.is(media(0, [{ sizes: [200] }], breakpoints), undefined)
  t.is(media(0, [{ sizes: [200, 800] }], breakpoints), undefined)

  breakpoints = [768]
  t.is(media(0, [{ sizes: [200] }, { sizes: [800] }], breakpoints), '(max-width: 768px)')
  t.is(media(1, [{ sizes: [200] }, { sizes: [800] }], breakpoints), undefined)

  t.throws(() => media(2, [{ sizes: [200] }, { sizes: [800] }, { sizes: [1200] }], breakpoints), {
    message: 'Provide enough breakpoints for every image: 3 images expected to have 2 breakpoints',
  })

  breakpoints = [768, 1024]
  t.is(media(0, [{ sizes: [200] }, { sizes: [800] }, { sizes: [1200] }], breakpoints), '(max-width: 768px)')
  t.is(media(1, [{ sizes: [200] }, { sizes: [800] }, { sizes: [1200] }], breakpoints), '(max-width: 1024px)')
  t.is(media(2, [{ sizes: [200] }, { sizes: [800] }, { sizes: [1200] }], breakpoints), undefined)
})

// test cases
//
// src=[universal?sizes=200]
// src=[universal?sizes=200,400]
// src=[universal?sizes=200,800,1200]
// src=[mobile?sizes=200, desktop?sizes=800]
// src=[mobile?sizes=200, desktop?sizes=800,1200]
// src=[mobile?sizes=200,400, desktop?sizes=800,1200] breakpoints=[768]

// mobile | desktop
// breakpoints=[768]
// src=[universal?sizes=200] - works fine, show it everywhere - TODO: test
// src=[universal?sizes=200,400] - works fine, show each size based on breakpoints translated to sizes, and use 100vw in the last case?
// src=[universal?sizes=200,800,1200] - works fine, show each size based on breakpoints translated to sizes, and use 100vw in the last case?
// src=[mobile?sizes=200, desktop?sizes=800] - works fine, show each size based on breakpoints using media, no sizes since no multiple imgs..
// src=[mobile?sizes=200, desktop?sizes=800,1200] - works fine, show each size based on breakpoints using media, in desktop multiple sizes.. no sizes
// src=[mobile?sizes=200,400, desktop?sizes=800,1200] - no sizes by default, assumes 100vw

/**

(max-width: 1024px) 800px,
                   50vw

<Picture>
  <Picture src={require('./small.png?sizes=400,768')} breakpoints={[400,768]} sizes={['100vw', '100vw']} />
  <Picture src={require('./large.png?sizes=800,1500')} breakpoints={[1200]} sizes={['800px', '50vw']} />
</Picture>

<Picture>
  <Picture
    src={[
      require('./small.png?sizes=400,768'),
      require('./large.png?sizes=800,1500')
    ]}
    breakpoints={[400,768,1200]}
    sizes={['100vw', '100vw', '800px', '50vw']} />
</Picture>

<Picture>
  <Picture
    src={[
      require('./small.png?sizes=400,768'),
      require('./large.png?sizes=800,1500')
    ]}
    breakpoints={[400,768,1200]}
    sizes={['(max-width: 500px) 25vw']} />
</Picture>

sizes=400,600,800,1500

A - 0    - 400
B - 400  - 768
C - 768  - 1200
D - 1200 - Infinity

sizes={['100vw', '100vw', '800px', '50vw']}
*/

// by default.. no sizes.. only media queries for multiple images based on the default breakpoint of [768]..
// if you specify multiple sizes that still assumes 100vw by default.. so if you want to customize sizes, you have to specify them manually..
