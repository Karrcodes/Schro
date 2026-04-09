export const dynamic = 'force-dynamic'
column = 'vision_image_url' }
                    else if (type === 'wishlist') { table = 'sys_wishlist'; column = 'image_url' }
                    else if (type === 'aspiration') { table = 'sys_aspirations'; column = 'vision_image_url' }
                    
                    if (table) {
                        await supabase.from(table).update({ [column]: internalUrl }).eq('id', id)
                        debug.push(`✅ Database Updated (${table}.${column})`)
                    }
                }
            } else {
                debug.push(`⚠️ Storage Fail. Returning fallback.`)
                finalImageUrl = absoluteFallback
            }
        } else {
            debug.push(`❌ Image Generation Failed. Falling back.`)
            finalImageUrl = absoluteFallback
        }

        if (url.searchParams.get('json') === 'true') {
            return NextResponse.json({ url: finalImageUrl, debug })
        }
        return NextResponse.redirect(new URL(finalImageUrl), 302)

    } catch (e: any) {
        return NextResponse.json({ url: absoluteFallback, error: e.message, debug })
    }
}
