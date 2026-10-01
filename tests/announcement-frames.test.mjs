import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function load(relative, dependencies={}) {
  const code=ts.transpileModule(fs.readFileSync(path.join(root,relative),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const exports={};
  vm.runInNewContext(code,{exports,require:name=>{
    if(name in dependencies)return dependencies[name];
    throw Error('Unexpected import: '+name);
  },File,Uint8Array,crypto,process,console,URL,window:{location:{href:'https://example.test/visor'}}});
  return exports;
}
const frames=load('lib/display/announcementFrames.ts');
const profile={role:'editor_profe',center_id:'center-a',is_active:true};
const video={id:'video-a',type:'announcement',center_id:'center-a',uploaded_by_user_id:'user-a',is_active:true,status:'pending_approval',vimeo_id:'123',frames_urls:[]};
function jpeg(size=20){return new File([new Uint8Array([255,216,255]),new Uint8Array(size-3)],'capture.jpg',{type:'image/jpeg'});}
function fixture(options={}) {
  const state={uploads:[],removals:[],jobs:[],updates:[],...options};
  const saved={...video,...options.video};
  const session={auth:{getUser:async()=>({data:{user:options.anonymous?null:{id:'user-a'}}})},from:table=>{
    const chain={select:()=>chain,eq:()=>chain,single:async()=>({data:table==='users'?(options.profile===null?null:{...profile,...options.profile}):saved})};return chain;
  }};
  const admin={storage:{from:()=>({upload:async(name)=>{
    if(state.uploads.length===options.failUploadAt)return {error:{message:'upload failed'}};
    state.uploads.push(name);return {error:null};
  },getPublicUrl:name=>({data:{publicUrl:'https://example.test/storage/v1/object/public/announcement-frames/'+name}}),remove:async names=>{state.removals.push(...names);return {error:options.failRemove?{message:'remove failed'}:null};}})},from:table=>{
    if(table==='media_cleanup_jobs')return {upsert:async jobs=>{state.jobs.push(...jobs);return {error:null};}};
    let update; const conditions=[];
    const chain={update:values=>{update=values;return chain;},eq:(key,value)=>{conditions.push([key,value]);return chain;},select:()=>chain,single:async()=>{
      const current={...saved,...options.changedVideo};
      const matches=conditions.every(([key,value])=>key==='frames_urls'?JSON.stringify(current[key])===value:current[key]===value);
      if(!matches)return {data:null,error:{message:'conflict'}};
      state.updates.push(update);Object.assign(saved,update);return {data:{id:saved.id},error:null};
    }};return chain;
  }};
  const route=load('app/api/videos/[id]/frames/route.ts',{
    'next/server':{NextResponse:{json:(body,init)=>({body,status:init?.status||200})}},
    '@supabase/supabase-js':{createClient:()=>admin},
    '@/utils/supabase/server':{createClient:async()=>session},
    '@/lib/display/announcementFrames':frames,
  });
  async function post(files=[jpeg()],vimeoId='123'){
    const form=new FormData();form.set('vimeo_id',vimeoId);files.forEach(file=>form.append('frames',file));
    return route.POST(new Request('https://example.test/api/videos/video-a/frames',{method:'POST',body:form}),{params:Promise.resolve({id:'video-a'})});
  }
  return {post,state,saved};
}
test('authorization blocks content, display, inactive users, null/wrong centers and other students',async()=>{
  for(const options of [
    {video:{type:'content'}},{profile:{role:'display'}},{profile:{is_active:false}},
    {profile:null},{profile:{center_id:null}},{profile:{center_id:'center-b'}},
    {profile:{role:'editor_alumne'},video:{uploaded_by_user_id:'other'}},
    {profile:{role:'editor_alumne'},video:{status:'published'}},{video:{is_active:false}},
  ]){
    const f=fixture(options);assert.equal((await f.post()).status,403);assert.equal(f.state.uploads.length,0);assert.equal(f.state.updates.length,0);
  }
});
test('anonymous requests are denied before uploads',async()=>{const f=fixture({anonymous:true});assert.equal((await f.post()).status,401);assert.equal(f.state.uploads.length,0);});
test('teacher, global admin and owner student can persist announcement frames',async()=>{
  for(const p of [profile,{...profile,role:'admin_global',center_id:null},{...profile,role:'editor_alumne'}]){
    const f=fixture({profile:p});const response=await f.post([jpeg(),jpeg()]);assert.equal(response.status,200);assert.equal(f.saved.frames_urls.length,2);assert.equal(f.state.removals.length,0);
  }
});
test('wrong Vimeo ID, empty/oversized/invalid/non-JPEG batches cannot write',async()=>{
  const f=fixture();assert.equal((await f.post([jpeg()],'old')).status,409);
  for(const files of [[],Array.from({length:31},()=>jpeg()),[jpeg(128*1024+1)],[new File(['no'],'x.jpg',{type:'image/jpeg'})],[new File(['text'],'x.html',{type:'text/html'})]])assert.equal((await f.post(files)).status,400);
  assert.equal(f.state.uploads.length,0);
});
test('upload failure cleans the partial batch and preserves previous frames',async()=>{
  const f=fixture({failUploadAt:1,video:{frames_urls:['old']}});assert.equal((await f.post([jpeg(),jpeg()])).status,500);assert.deepEqual(f.saved.frames_urls,['old']);assert.deepEqual(f.state.removals,f.state.uploads);assert.equal(f.state.updates.length,0);
});
test('concurrent replacement, type change or deletion prevents attachment and cleans uploads',async()=>{
  for(const changedVideo of [{vimeo_id:'456'},{type:'content'},{is_active:false},{frames_urls:['concurrent']}]){
    const f=fixture({changedVideo});assert.equal((await f.post()).status,500);assert.equal(f.state.updates.length,0);assert.deepEqual(f.state.removals,f.state.uploads);
  }
});
test('failed cleanup is queued only within this video prefix',async()=>{
  const f=fixture({failRemove:true,video:{frames_urls:['https://example.test/storage/v1/object/public/announcement-frames/video-a/old.jpg','https://example.test/storage/v1/object/public/announcement-frames/other/keep.jpg']}});
  assert.equal((await f.post()).status,200);assert.equal(f.state.jobs.length,1);assert.equal(f.state.jobs[0].resource_identifier,'video-a/old.jpg');
});

test('slideshow keeps thumbnail without frames and falls back when a capture fails',()=>{
  const jsx=(type,props)=>({type,props});
  const slideshow=load('app/components/display/AnnouncementSlideshow.tsx',{
    react:{useState:value=>[value,()=>{}],useEffect:()=>{},useRef:value=>({current:value})},
    'react/jsx-runtime':{jsx,jsxs:jsx},'next/image':{default:()=>null},
  }).default;
  function image(tree){if(!tree)return null;if(Array.isArray(tree))return tree.map(image).find(Boolean);if(tree.type==='img')return tree;return image(tree.props?.children);}
  const thumbnail='https://example.test/thumbnail.jpg';
  const legacy=image(slideshow({videos:[{id:'a',title:'old',frames_urls:[],thumbnail_url:thumbnail}]}));
  assert.equal(legacy.props.src,thumbnail);
  const captured=image(slideshow({videos:[{id:'a',title:'new',frames_urls:['https://example.test/missing.jpg'],thumbnail_url:thumbnail}]}));
  const currentTarget={src:captured.props.src};captured.props.onError({currentTarget});assert.equal(currentTarget.src,thumbnail);
  captured.props.onError({currentTarget});assert.equal(currentTarget.src,thumbnail);
});
