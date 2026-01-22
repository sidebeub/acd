import { prisma } from '@/lib/prisma'
import { ProjectBrowser } from '@/components/project/ProjectBrowser'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      tags: true,
      programs: {
        include: {
          routines: {
            include: {
              rungs: {
                orderBy: { number: 'asc' }
              }
            },
            orderBy: { name: 'asc' }
          }
        },
        orderBy: { name: 'asc' }
      }
    }
  })

  if (!project) {
    notFound()
  }

  return <ProjectBrowser project={project} />
}
