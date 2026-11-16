
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get("lat")
    const lng = searchParams.get("lng")

    if (!lat || !lng) {
      return NextResponse.json(
        { ok: false, error: "Latitude and longitude are required" },
        { status: 400 }
      )
    }

    const apiKey =
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
      "AIzaSyDdGgtZcczPM_o5P7BzBXmF6q2jW8Plv3I"

    const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(
      lat
    )},${encodeURIComponent(lng)}&key=${encodeURIComponent(apiKey)}`

    const mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`

    const res = await fetch(googleUrl, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    })

    if (!res.ok) {
      return NextResponse.json({
        ok: true,
        formatted_address: `Coordinates: ${lat}, ${lng}`,
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        pincode: "",
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        google_maps_url: mapsUrl,
      })
    }

    const data = await res.json()
    const results = data.results || []
    const first = results[0] || {}

    let addressLine1 = ""
    let addressLine2 = ""
    let city = ""
    let state = ""
    let pincode = ""

    const comps: Array<{ long_name: string; short_name: string; types: string[] }> =
      first.address_components || []

    let streetNumber = ""
    let route = ""
    let sublocality = ""
    let neighborhood = ""

    for (const c of comps) {
      const types = c.types || []
      if (types.includes("street_number")) {
        streetNumber = c.long_name
      } else if (types.includes("route")) {
        route = c.long_name
      } else if (types.includes("sublocality") || types.includes("sublocality_level_1")) {
        sublocality = c.long_name
      } else if (types.includes("sublocality_level_2") || types.includes("neighborhood")) {
        neighborhood = c.long_name
      } else if (types.includes("locality")) {
        city = c.long_name
      } else if (!city && types.includes("administrative_area_level_2")) {
        city = c.long_name
      } else if (types.includes("administrative_area_level_1")) {
        state = c.long_name
      } else if (types.includes("postal_code")) {
        pincode = c.long_name
      }
    }

    addressLine1 = [streetNumber, route].filter(Boolean).join(" ").trim()
    addressLine2 = [neighborhood, sublocality].filter(Boolean).join(", ").trim()

    if (!addressLine1 && first.formatted_address) {
      // Split formatted address if components were partial
      const parts = first.formatted_address.split(",")
      addressLine1 = (parts[0] || "").trim()
      if (parts.length > 1 && !addressLine2) {
        addressLine2 = (parts[1] || "").trim()
      }
    }

    return NextResponse.json({
      ok: true,
      formatted_address: first.formatted_address || `Coordinates: ${lat}, ${lng}`,
      address_line1: addressLine1,
      address_line2: addressLine2,
      city: city,
      state: state,
      pincode: pincode,
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      google_maps_url: mapsUrl,
    })
  } catch (err) {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get("lat") || ""
    const lng = searchParams.get("lng") || ""
    return NextResponse.json({
      ok: true,
      formatted_address: lat && lng ? `Coordinates: ${lat}, ${lng}` : "",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      pincode: "",
      latitude: lat ? parseFloat(lat) : null,
      longitude: lng ? parseFloat(lng) : null,
      google_maps_url: lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null,
    })
  }
}
