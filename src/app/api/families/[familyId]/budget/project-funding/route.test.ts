jest.mock('@/lib/auth-utils',()=>({requireFamilyAccess:(handler:unknown)=>handler}));
jest.mock('@/lib/prisma',()=>({__esModule:true,default:{familyDocument:{findUnique:jest.fn(),create:jest.fn(),updateMany:jest.fn()}}}));
jest.mock('next/server',()=>({NextResponse:{json:(body:unknown,init?:{status?:number;headers?:unknown})=>({body,status:init?.status??200,headers:init?.headers})}}));
import prisma from '@/lib/prisma';
import { GET,PUT } from './route';
const context={params:Promise.resolve({familyId:'home'})};
const auth={familyMemberId:'parent'};
let data:unknown=null, version=0;
const put=(body:unknown)=>(PUT as any)({text:async()=>JSON.stringify(body)},context,auth);
beforeEach(()=>{
  jest.clearAllMocks();data=null;version=0;
  (prisma.familyDocument.findUnique as jest.Mock).mockImplementation(async({where}:any)=>where.familyId_key.key==='property.projects'?{data:[{id:'windows',title:'Windows',quotes:[]}]}:data?{data,version}:null);
  (prisma.familyDocument.create as jest.Mock).mockImplementation(async(args:any)=>{data=args.data.data;version=1;return{version};});
  (prisma.familyDocument.updateMany as jest.Mock).mockImplementation(async(args:any)=>{data=args.data.data;version++;return{count:1};});
});
test('GET reads only the household documents and never a bank balance',async()=>{
  const response=await(GET as any)({},context);
  expect(response.body).toMatchObject({fund:null,allocated:0,version:0});
  expect(response.headers['Cache-Control']).toBe('private, no-store');
  for(const [request] of (prisma.familyDocument.findUnique as jest.Mock).mock.calls)expect(request.where.familyId_key.familyId).toBe('home');
});
test('creates and version-updates the plan without editing projects, quotes or bank rows',async()=>{
  expect((await put({action:'fund',amount:10000,baseVersion:0})).status).toBe(200);
  expect((await put({action:'allocate',projectId:'windows',amount:3000,reservePercent:10,baseVersion:1})).status).toBe(200);
  expect(data).toMatchObject({fund:10000,allocations:{windows:{amount:3000,reservePercent:10,title:'Windows'}}});
  expect(prisma.familyDocument.updateMany).toHaveBeenCalledWith(expect.objectContaining({where:{familyId:'home',key:'money.project-funding',version:1}}));
});
test('rejects stale versions, foreign projects, invalid values and racing writes',async()=>{
  await put({action:'fund',amount:1000,baseVersion:0});
  expect((await put({action:'fund',amount:2000,baseVersion:0})).status).toBe(409);
  expect((await put({action:'allocate',projectId:'another-household-project',amount:100,reservePercent:0,baseVersion:1})).status).toBe(404);
  expect((await put({action:'fund',amount:-1,baseVersion:1})).status).toBe(400);
  (prisma.familyDocument.updateMany as jest.Mock).mockResolvedValueOnce({count:0});
  expect((await put({action:'fund',amount:500,baseVersion:1})).status).toBe(409);
});
test('handles concurrent initial creation, unavailable storage and malformed bodies without claiming success',async()=>{
  (prisma.familyDocument.create as jest.Mock).mockRejectedValueOnce({code:'P2002'});
  expect((await put({action:'fund',amount:10,baseVersion:0})).status).toBe(409);
  (prisma.familyDocument.findUnique as jest.Mock).mockRejectedValue(new Error('down'));
  expect((await(GET as any)({},context)).status).toBe(503);
  expect((await put({action:'fund',amount:10,baseVersion:0})).status).toBe(503);
  expect((await(PUT as any)({text:async()=>'{broken'},context,auth)).status).toBe(400);
});
