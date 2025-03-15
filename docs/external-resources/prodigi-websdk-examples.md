## **Overview**

The [Print Shop SDK](https://www.npmjs.com/package/@kite-tech/web-app-sdk) provides an API to lau nch your app with pre-configured data, such as images, at run-time. This page provides common use cases of launching your Print Shop with examples. Use the [sandbox](https://sdk.prodigi.com/print-shop/sandbox) section to try out various SDK configurations.

Compatible with the [Print on Demand Shop](https://shop.prodigi.com/) by [Prodigi](https://www.prodigi.com/). Get yours at the [Prodigi Apps Dashboard](https://dashboard.prodigi.com/apps).

## **Content**

* [Pass an image using query paramters](https://sdk.prodigi.com/print-shop/examples#pass-an-image-using-query-paramters)  
* [Deep link to create product page](https://sdk.prodigi.com/print-shop/examples#deep-link-to-create-product-page)  
* [Deep link to create product page with an image](https://sdk.prodigi.com/print-shop/examples#deep-link-to-create-product-page-with-an-image)  
* [Use the SDK to pass user details](https://sdk.prodigi.com/print-shop/examples#use-the-sdk-to-pass-user-details)  
* [Use the SDK to pass images](https://sdk.prodigi.com/print-shop/examples#use-the-sdk-to-pass-images)

### Link Anchor**Pass an image using query paramters**

To pass an image to the print shop without the use of an SDK, use the `image` query parameter and specify its width x height at the end. For example:

[`https://shop.prodigi.com/prodigi?image=https://s3.amazonaws.com/kiteshopify/064218db-b8be-4c11-928d-cb54a1d163ef.jpeg|1280x1280`](https://shop.prodigi.com/prodigi?image=https://s3.amazonaws.com/kiteshopify/064218db-b8be-4c11-928d-cb54a1d163ef.jpeg|1280x1280)

This is of the form:

`https://shop.prodigi.com/${brandName}?image=${imageUrl}|${imageWidth}x${imageHeight}`

Make sure the image URL is encoded. The JavaScript function [encodeURIComponent()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent) can be used for the same.

### Link Anchor**Deep link to create product page**

The create page can be launched with a product selected. For example, to launch the 12"x12" Suede cushion:

[`https://shop.prodigi.com/prodigi/create/suede_12x12_cushion`](https://shop.prodigi.com/prodigi/create/suede_12x12_cushion)

This is of the form:

`https://shop.prodigi.com/create/${templateId}`

The template IDs for all products available can be found in your [apps dashboard](https://dashboard.prodigi.com/apps)

### Link Anchor**Deep link to create product page with an image**

The create page can be launched with a product selected and an image on it. For example, a 12"x12" Suede cushion with an image on it:

[`https://shop.prodigi.com/prodigi/create/suede_12x12_cushion?image=https://s3.amazonaws.com/kiteshopify/064218db-b8be-4c11-928d-cb54a1d163ef.jpeg|1280x1280`](https://shop.prodigi.com/prodigi/create/suede_12x12_cushion?image=https://s3.amazonaws.com/kiteshopify/064218db-b8be-4c11-928d-cb54a1d163ef.jpeg|1280x1280)

This is of the form:

`https://shop.prodigi.com/${brandName}/create/${templateId}?image=${imageUrl}|${imageWidth}x${imageHeight}`

Make sure the image URL is encoded. The JavaScript function [encodeURIComponent()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent) can be used for the same.

### Link Anchor**Use the SDK to pass user details**

The SDK can be used to pass user details to populate on checkout. The following is an example SDK configuration that can be passed to the `launchFromJSON()` SDK function:

{  
  "baseUrl": "https://shop.prodigi.com/prodigi",  
  "config": {  
    "startInNewTab": true  
  },  
  "checkoutUserFields": {  
    "shippingAddress": {  
      "recipient\_first\_name": "First Name",  
      "recipient\_last\_name": "Last Name",  
      "address\_line\_1": "Address line 1",  
      "address\_line\_2": "Address line 2",  
      "city": "London",  
      "postcode": "E1 5JL"  
    },  
    "customerEmail": "mail@example.com",  
    "termsOfService": false  
  }  
}

Try it out in the [sandbox](https://sdk.prodigi.com/print-shop/sandbox) section. A full list of options can be found on the SDK [npm package](https://www.npmjs.com/package/@kite-tech/web-app-sdk).

### Link Anchor**Use the SDK to pass images**

The SDK can also be used to pass images to the print shop. The following is an example SDK configuration that can be passed to the `launchFromJSON()` SDK function:

{  
  "baseUrl": "https://shop.prodigi.com/prodigi",  
  "config": {  
    "startInNewTab": true  
  },  
  "collectorImages": \[  
    {  
      "dimensions": {  
        "width": 1280,  
        "height": 1280  
      },  
      "id": "unique-image-id",  
      "isUploadComplete": true,  
      "thumbnailUrl": "https://s3.amazonaws.com/kiteshopify/f094d718-6b1d-4cd7-8138-20f1903a73a3\_preview.jpeg",  
      "url": "https://s3.amazonaws.com/kiteshopify/f094d718-6b1d-4cd7-8138-20f1903a73a3.jpeg"  
    }  
  \]  
}

Try it out in the [sandbox](https://sdk.prodigi.com/print-shop/sandbox) section. A full list of options can be found on the SDK [npm package](https://www.npmjs.com/package/@kite-tech/web-app-sdk).

