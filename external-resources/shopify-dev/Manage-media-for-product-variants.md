Manage media for product variants
You can use the GraphQL Admin API to add a media object of type IMAGE to a product's variants. For example, you can create a product, a product variant, and media object, and attach a media object to the product variant in a single step. You can also associate the product's media to its variants.

This guide shows how to manage media on product variants using the GraphQL Admin API.

RequirementsAnchor link to section titled "Requirements"
Your app can make authenticated requests to the GraphQL Admin API.
Your app has the read_products and write_products access scopes. Learn how to configure your access scopes using Shopify CLI.
You've created products and product variants in your development store.
Step 1: Query a product and display its variantsAnchor link to section titled "Step 1: Query a product and display its variants"
The following query returns information about any image media objects that are attached to the variants of a product:


POST https://{shop}.myshopify.com/admin/api/{api_version}/graphql.json
GraphQL query


query {
  product(id: "gid://shopify/Product/1") {
    title
    variants(first: 10) {
      edges {
        node {
          selectedOptions {
            name
            value
          }
          media(first: 10) {
            edges {
              node {
                alt
                mediaContentType
                status
                __typename
                ... on MediaImage {
                  id
                  preview {
                    image {
                      url
                    }
                  }
                  __typename
                }
              }
            }
          }
        }
      }
    }
  }
}
JSON response

{
  "data": {
    "product": {
      "title": "Polaris Watch",
      "variants": {
        "edges": [
          {
            "node": {
              "selectedOptions": [
                {
                  "name": "Width",
                  "value": "24m"
                },
                {
                  "name": "Length",
                  "value": "30m"
                }
              ],
              "media": {
                "edges": [
                  {
                    "node": {
                      "alt": "Girl in a t-shirt",
                      "mediaContentType": "IMAGE",
                      "status": "READY",
                      "__typename": "MediaImage",
                      "id": "gid://shopify/MediaImage/42729528",
                      "preview": {
                        "image": {
                          "url": "https://cdn.shopify.com/s/files/1/1768/1717/products/StockSnap_9NPZZJCWW3_copy.jpg?v=1566862515"
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        ]
      }
    }
  },
  "extensions": {
    "cost": {
      "requestedQueryCost": 343,
      "actualQueryCost": 46,
      "throttleStatus": {
        "maximumAvailable": 1000.0,
        "currentlyAvailable": 954,
        "restoreRate": 50.0
      }
    }
  }
}
Step 2: Create a product and associate media to its variantAnchor link to section titled "Step 2: Create a product and associate media to its variant"
When you create a new product using the productCreate mutation, you can include the mediaSrc attribute to specify the URL of the media to associate with the variant. This field matches one of the media originalSource fields that you created on the product.

When you create the variant options, make sure that you include the options values. These values must match the options that were set up on the product. For example, if the product has the variant options [“Color”, “Size”], then each variant should have a color and a size option, like [“Red”, “M”].


POST https://{shop}.myshopify.com/admin/api/{api_version}/graphql.json
GraphQL mutation

mutation productCreate($input: ProductInput!, $media: [CreateMediaInput!]) {
  productCreate(input: $input, media: $media) {
    product {
      id
      variants(first: 10) {
        edges {
          node {
            selectedOptions {
              name
              value
            }
            media(first: 10) {
              edges {
                node {
                  ... on MediaImage {
                    id
                    alt
                    image {
                      url
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
Variables

{
 "media": [
   {
     "mediaContentType": "IMAGE",
     "originalSource": "https://cdn.come/red_t_shirt.jpg"
   },
   {
     "mediaContentType": "IMAGE",
     "originalSource": "https://cdn.come/yellow_t_shirt.jpg"
   }
 ],
 "input": {
   "title": "T-shirt",
   "options": [
     "Color", "Size"
   ],
   "variants": [
     {
       "mediaSrc": ["https://cdn.come/red_t_shirt.jpg"],
       "options": ["Red", "M"]
     },
     {
       "mediaSrc": ["https://cdn.come/red_t_shirt.jpg"],
       "options": ["Red", "L"]
     },
     {
       "mediaSrc": ["https://cdn.come/yellow_t_shirt.jpg"],
       "options": ["Yellow", "M"]
     },
     {
       "mediaSrc": ["https://cdn.come/yellow_t_shirt.jpg"],
       "options": ["Yellow", "L"]
     }
   ]
 }
}
JSON response

{
  "data": {
    "productCreate": {
      "product": {
        "id": "gid://shopify/Product/1",
        "variants": {
          "edges": [
            {
              "node": {
                "selectedOptions": [
                  {
                    "name": "Color",
                    "value": "Red"
                  },
                  {
                    "name": "Size",
                    "value": "M"
                  }
                ],
                "media": {
                  "edges": [
                    {
                      "node": {
                        "id": "gid://shopify/MediaImage/1489599037496",
                        "alt": "Girl in a red medium-sized t-shirt",
                        "image": null
                      }
                    }
                  ]
                }
              }
            },
            {
              "node": {
                "selectedOptions": [
                  {
                    "name": "Color",
                    "value": "Red"
                  },
                  {
                    "name": "Size",
                    "value": "L"
                  }
                ],
                "media": {
                  "edges": [
                    {
                      "node": {
                        "id": "gid://shopify/MediaImage/1489599037496",
                        "alt": "Girl in a red large-sized t-shirt",
                        "image": null
                      }
                    }
                  ]
                }
              }
            },
            {
              "node": {
                "selectedOptions": [
                  {
                    "name": "Color",
                    "value": "Yellow"
                  },
                  {
                    "name": "Size",
                    "value": "M"
                  }
                ],
                "media": {
                  "edges": [
                    {
                      "node": {
                        "id": "gid://shopify/MediaImage/1489599070264",
                        "alt": "Girl in a yellow medium-sized t-shirt",
                        "image": null
                      }
                    }
                  ]
                }
              }
            },
            {
              "node": {
                "selectedOptions": [
                  {
                    "name": "Color",
                    "value": "Yellow"
                  },
                  {
Step 3: Attach media to an existing product variantAnchor link to section titled "Step 3: Attach media to an existing product variant"
To attach a media object to an existing product variant, you must do the following:

Create the media on the product using the productCreateMedia mutation.
If the product doesn't have variants, then you must create at least one variant on the product.
Refer to the productCreate, productUpdate, or productVariantCreate mutations for more information.

When you have a product with a media object and variants, you can use the productVariantAppendMedia mutation to associate the media id to one or more variant ids, as shown in the following example mutation:


POST https://{shop}.myshopify.com/admin/api/{api_version}/graphql.json
GraphQL mutation

Copy

mutation ($variantMedia: [ProductVariantAppendMediaInput!]!) {
  productVariantAppendMedia(productId: "gid://shopify/Product/1", variantMedia: $variantMedia) {
    product {
      id
    }
    productVariants {
      media(first: 10) {
        edges {
          node {
            mediaContentType
            preview {
              image {
                url
              }
            }
          }
        }
      }
    }
    userErrors {
      code
      field
      message
    }
  }
}
Variables

{
    "variantMedia": [
        {
            "variantId": "gid://shopify/ProductVariant/1",
            "mediaIds": ["gid://shopify/MediaImage/1"]
        },
        {
            "variantId": "gid://shopify/ProductVariant/2",
            "mediaIds": ["gid://shopify/MediaImage/1"]
        },
        {
            "variantId": "gid://shopify/ProductVariant/3",
            "mediaIds": ["gid://shopify/MediaImage/2"]
        },
        {
            "variantId": "gid://shopify/ProductVariant/4",
            "mediaIds": ["gid://shopify/MediaImage/2"]
        }
    ]
}
JSON response

{
  "data": {
    "productVariantAppendMedia": {
      "product": {
        "id": "gid://shopify/Product/1"
      },
      "productVariants": [
        {
          "media": {
            "edges": [
              {
                "node": {
                  "mediaContentType": "IMAGE",
                  "preview": {
                    "image": {
                      "url": "https://cdn.shopify.com/s/files/1/0013/1245/6760/products/istock_e4f127b277.jpg?v=151354"
                    }
                  }
                }
              }
            ]
          }
        },
        {
          "media": {
            "edges": [
              {
                "node": {
                  "mediaContentType": "IMAGE",
                  "preview": {
                    "image": {
                      "url": "https://cdn.shopify.com/s/files/1/0013/1245/6760/products/istock_e4f127b277.jpg?v=151354"
                    }
                  }
                }
              }
            ]
          }
        },
        {
          "media": {
            "edges": [
              {
                "node": {
                  "mediaContentType": "IMAGE",
                  "preview": {
                    "image": {
                      "url": "https://cdn.shopify.com/s/files/1/0013/1245/6760/products/istock_00004f2ea339.jpg?v=13783"
                    }
                  }
                }
              }
            ]
          }
        },
        {
          "media": {
            "edges": [
              {
                "node": {
                  "mediaContentType": "IMAGE",
                  "preview": {
                    "image": {
                      "url": "https://cdn.shopify.com/s/files/1/0013/1245/6760/products/istock_00004f2ea339.jpg?v=13783"
                    }
                  }
                }
              }
            ]
          }
Step 4: Remove media from a variantAnchor link to section titled "Step 4: Remove media from a variant"
To detach media from a variant, you can use the productVariantDetachMedia mutation.

After you use the mutation, the media won't be associated with the variant anymore, but the media will still be associated with the product. You can use the productDeleteMedia mutation to remove the media from the product as well.

The following example demonstrates how to use the productVariantDetachMedia mutation to disassociate a media object from a product variant.


POST https://{shop}.myshopify.com/admin/api/{api_version}/graphql.json
GraphQL mutation

mutation productVariantDetachMedia(
  $variantMedia: [ProductVariantDetachMediaInput!]!
) {
  productVariantDetachMedia(
    productId: "gid://shopify/Product/1"
    variantMedia: $variantMedia
  ) {
    product {
      id
    }
    productVariants {
      id
      media(first: 10) {
        edges {
          node {
            preview {
              image {
                url
              }
            }
          }
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
Variables

{
  "variantMedia": [
    {
      "variantId": "gid://shopify/ProductVariant/1",
      "mediaIds": [
        "gid://shopify/Media/1"
      ]
    },
    {
      "variantId": "gid://shopify/ProductVariant/2",
      "mediaIds": [
        "gid://shopify/Media/2"
      ]
    }
  ]
}
JSON response

{
  "data": {
    "productVariantDetachMedia": {
      "product": {
        "id": "gid://shopify/Product/1"
      },
      "productVariants": [
        {
          "id": "gid://shopify/ProductVariant/1",
          "media": {
            "edges": []
          }
        },
        {
          "id": "gid://shopify/ProductVariant/2",
          "media": {
            "edges": []
          }
        }
      ],
      "userErrors": []
    }
  },
  "extensions": {
    "cost": {
      "requestedQueryCost": 42,
      "actualQueryCost": 14,
      "throttleStatus": {
        "maximumAvailable": 1000.0,
        "currentlyAvailable": 986,
        "restoreRate": 50.0
      }
    }
  }
}