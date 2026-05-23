import sharp from 'sharp'

await sharp('public/logo.png').resize(192,192).png().toFile('public/icon-192.png')
await sharp('public/logo.png').resize(512,512).png().toFile('public/icon-512.png')
await sharp('public/logo.png').resize(180,180).png().toFile('public/apple-touch-icon.png')
await sharp('public/logo.png').resize(390,844,{fit:'contain',background:'#1a1a1a'}).png().toFile('public/screenshot-mobile.png')
await sharp('public/logo.png').resize(1280,800,{fit:'contain',background:'#1a1a1a'}).png().toFile('public/screenshot-desktop.png')

console.log('Done.')
