import test from 'node:test';
import assert from 'node:assert/strict';
import {validPerformanceLink} from '../public/performance-link.js';
test('performance links accept shared HTTPS platforms without fetching their contents',()=>{
 for(const url of ['https://youtu.be/example','https://www.youtube.com/watch?v=test','https://drive.google.com/file/d/test/view?usp=sharing','https://drive.google.com/open?id=test','https://vm.tiktok.com/test/','https://v.douyin.com/test/','https://vimeo.com/12345','https://media.example.org/performance.mp3'])assert.equal(validPerformanceLink(url),true,url);
});
test('performance links reject active content, embedded credentials and internal destinations',()=>{
 for(const url of ['',null,'javascript:alert(1)','data:text/html,test','http://youtu.be/test','https://user:password@youtube.com/test','https://localhost/test','https://127.0.0.1/test','https://0x7f000001/test','https://[::1]/test','https://files.internal/test','https://host.local/test','https://youtube.com:8443/test','https://www.youtube.com/\nwatch','https://youtube.com/'+ 'x'.repeat(2048)])assert.equal(validPerformanceLink(url),false,String(url).slice(0,100));
});
