## Workflow

next

/page1, /page2...
outputs: /resources/a@1.png, resources/b@1.png

make some changes

/page1, /page2...
outputs: /resources/a@1.png, /resources/a@2.png, /resources/a@3.png, resources/b@1.png

commit.. ?

or run..
next-img
clears our all images, rebuilds all (reading from .next/cache to reduce work necessary)
now you can commit

next build only uses cached resources and throws otherwise (if persistentCache is on.., otherwise it just uses the temp .next/cache if available)
if it throws, you know you need to rerun next-img
