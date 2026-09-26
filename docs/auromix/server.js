const http=require("http"),fs=require("fs"),path=require("path");
const root=__dirname;
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".webmanifest":"application/manifest+json"};
const server=http.createServer((req,res)=>{
  let p=decodeURIComponent((req.url||"/").split("?")[0]);
  if(p==="/")p="/index.html";
  if(p.includes("..")){res.writeHead(400);return res.end("Bad request");}
  const file=path.join(root,p);
  fs.stat(file,(e,s)=>{
    if(!e&&s.isFile()){res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream","Cache-Control":"public,max-age=300"});fs.createReadStream(file).pipe(res);}
    else {res.writeHead(404,{"Content-Type":"text/plain"});res.end("Not found");}
  });
});
server.listen(process.env.PORT||3000,"0.0.0.0",()=>console.log("AuroMix Studio running"));
