#!/usr/bin/env node

/**
 * GoldVision - Download Gold Images Script
 * Downloads high-quality gold images from Unsplash for the News Feed
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const images = [
  {
    name: 'gold-bars-stacked.jpg',
    url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=250&fit=crop&crop=center&q=80',
    description: 'Gold bars stacked - for institutional stories'
  },
  {
    name: 'gold-jewelry-collection.jpg', 
    url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=250&fit=crop&crop=center&q=80',
    description: 'Gold jewelry collection - for consumer demand stories'
  },
  {
    name: 'gold-bangles-display.jpg',
    url: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&h=250&fit=crop&crop=center&q=80',
    description: 'Gold bangles display - for cultural stories'
  },
  {
    name: 'gold-jewelry-store.jpg',
    url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=250&fit=crop&crop=center&q=80',
    description: 'Gold jewelry store - for retail stories'
  },
  {
    name: 'gold-rings-collection.jpg',
    url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=250&fit=crop&crop=center&q=80',
    description: 'Gold rings collection - for investment stories'
  }
];

function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path.join(__dirname, filename));
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${filename}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded: ${filename}`);
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(filename, () => {}); // Delete the file on error
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function downloadAllImages() {
  console.log('🏆 GoldVision - Downloading Gold Images');
  console.log('=====================================');
  console.log('');
  
  try {
    for (const image of images) {
      console.log(`📥 Downloading: ${image.name}`);
      console.log(`   ${image.description}`);
      await downloadImage(image.url, image.name);
    }
    
    console.log('');
    console.log('✨ All gold images downloaded successfully!');
    console.log('🎯 Images are now ready for the Professional Financial News Feed');
    
  } catch (error) {
    console.error('❌ Error downloading images:', error.message);
    process.exit(1);
  }
}

// Run the download
downloadAllImages();
