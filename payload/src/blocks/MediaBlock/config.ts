import type { Block } from 'payload'
import { sectionAppearance } from '@/fields/sectionAppearance'

export const MediaBlock: Block = {
  slug: 'mediaBlock',
  interfaceName: 'MediaBlockType',
  labels: { singular: 'Afbeelding of video', plural: 'Afbeeldingen en videos' },
  fields: [
    {
      name: 'kind',
      type: 'radio',
      label: 'Type',
      defaultValue: 'image',
      options: [
        { label: 'Afbeelding', value: 'image' },
        { label: 'Video-embed', value: 'video' },
      ],
      admin: { layout: 'horizontal' },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Afbeelding',
      required: true,
      admin: { condition: (_, s) => s?.kind === 'image' },
    },
    {
      name: 'videoUrl',
      type: 'text',
      label: 'Video-URL',
      required: true,
      admin: {
        condition: (_, s) => s?.kind === 'video',
        description: 'De embed-URL, bijvoorbeeld van Mux of YouTube.',
      },
    },
    {
      name: 'videoTitle',
      type: 'text',
      label: 'Titel van de video',
      required: true,
      admin: {
        condition: (_, s) => s?.kind === 'video',
        description: 'Verplicht voor schermlezers.',
      },
    },
    {
      name: 'videoPoster',
      type: 'upload',
      relationTo: 'media',
      label: 'Poster voor de video',
      admin: {
        condition: (_, s) => s?.kind === 'video',
        description:
          'Het stilstaande beeld tot de video speelt. Laat je dit leeg, dan is dat zwart — vooral zichtbaar voor bezoekers die bewegend beeld hebben uitgezet.',
      },
    },
    {
      name: 'fullBleed',
      type: 'checkbox',
      label: 'Over de volle schermbreedte',
      defaultValue: false,
    },
    { name: 'caption', type: 'text', label: 'Bijschrift' },
    sectionAppearance,
  ],
}
