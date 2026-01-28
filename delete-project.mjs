import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find and delete projects with LANLOGIX in the name
  const projects = await prisma.project.findMany({
    where: {
      name: {
        contains: 'LANLOGIX'
      }
    }
  });
  
  console.log('Found projects:', projects.map(p => ({ id: p.id, name: p.name })));
  
  for (const project of projects) {
    await prisma.project.delete({ where: { id: project.id } });
    console.log('Deleted project:', project.name);
  }
  
  console.log('Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
