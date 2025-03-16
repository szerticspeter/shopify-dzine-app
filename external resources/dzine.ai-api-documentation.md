## **Getting Started**

Welcome to the Dzine.AI Developer API\! This guide is designed to assist you in getting started.

### **1\. Introduction**

The Dzine.AI Developer API allows users to create and transform images using either textual descriptions or existing images. Our API supports:

* Text-to-Image: Convert text descriptions into high-quality images—perfect for visualizing concepts or storytelling.  
* Image-to-Image: Transform or stylize an existing image while maintaining its core elements—ideal for style transfer or refining designs.

#### **How It Works**

The Dzine.AI API uses RESTful architecture. Authenticate with your API key, submit text or images, and receive generated images along with metadata.

* Text-to-Image: Submit a text prompt and get an image that aligns with your description.  
* Image-to-Image: Upload an image, and the API will transform it into a new, stylized version.

### **2\. Get Your API Key**

All API requests require basic authentication using an API key and secret. To generate an API key:

1\. Go to [Dzine API Portal](https://www.dzine.ai/api) and subscribe to a plan if you haven't already.  
2\. Click "Add API Key" button.  
3\. Follow the instructions to create a new Open APP and obtain your API key.

### **3\. Basic Authentication**

The API uses basic authentication. All requests must include the authorization header set to your {API\_KEY}.

## **API Reference**

The following APIs provide a detailed overview of each endpoint, including associated request parameters and response data structures.

For each endpoint, we also provide implementation examples in multiple programming languages: Shell, Python, and JavaScript.

### **1\. Load Dzine Style List**

#### **Description:**

Dzine offers a broad range of styles for image generation, which are based on two foundational models: S and X. Developers can retrieve the full list of available styles using this endpoint. The Style List API supports pagination.

#### **Request URL:**

GET https://papi.dzine.ai/openapi/v1/style/list

#### **Request Header:**

| Key | Value | Description |
| ----- | ----- | ----- |
| Content-Type | application/json | Specifies the format of the data being sent to the server. |
| Authorization | {API\_KEY} | API key for authenticating requests to the Dzine Developer API server. |

#### **Request Body:**

| Key | Type | Required | Default Value | Description |
| ----- | ----- | ----- | ----- | ----- |
| page\_no | int | no | 0 | The current page number in a paginated request. |
| page\_size | int | no | 50 | The number of items per page in a paginated request. |

#### **Response Body:**

{  
  "code": 200,  
  "msg": "OK",  
  "data": {  
    "page\_no": 0,  
    "page\_size": 10,  
    "total": 208,  
    "msg": "",  
    "list": \[  
      {  
        "name": "No Style v2", *// It is the same as the style names in Dzine.ai.*  
        "base\_model": "S",  
        "style\_code": "Style-7feccf2b-f2ad-43a6-89cb-354fb5d928d2", *// Unique code for each style.*  
        "cover\_url": "https://static.stylar.ai/stylar\_admin/common/style\_avatar/6ce8b5158b63c56d32cd8305a73ecab8/1721212364855681\_11\_312.jpg",  
        "style\_intensity": {  
          "img2img": 0,  
          "txt2img": 0  
        }  
      }  
      *// ... More styles*  
    \]  
  }  
}

#### **Code Example:**

BashPythonJavaScript

*\#Get full style list*  
curl \--location \--request GET 'https://papi.dzine.ai/openapi/v1/style/list' \\  
\--header 'Authorization: {API\_KEY}' \\  
\-F page\_no=0\&page\_size=10

### **2\. Get Token Balance**

#### **Description:**

Retrieve the token balance of the current Dzine Developer account.

#### **Request URL:**

GET https://papi.dzine.ai/openapi/v1/get\_token\_balance

#### **Request Header:**

| Key | Value | Description |
| ----- | ----- | ----- |
| Content-Type | application/json | Specifies the format of the data being sent to the server. |
| Authorization | {API\_KEY} | API key for authenticating requests to the Dzine Developer API. |

#### **Request Body:**

Not required for this endpoint.

#### **Response Body:**

{  
  "code": 200,  
  "msg": "OK",  
  "data": {  
    "balance": 11951  
  }  
}

#### **Code Example:**

BashPythonJavaScript

curl \--location \--request GET https://papi.dzine.ai/openapi/v1/get\_token\_balance \\  
\--header 'Authorization: {API\_KEY}'

### **3\. Upload Image (Optional)**

#### **Description:**

Upload your image to Dzine CDN if you want it to be publicly accessible. Additionally, if your image file is already publicly accessible, you can directly use the public file URL instead of providing base64 encoded image data. This method provides increased flexibility and simplifies the management of request parameters.

#### **Request URL:**

POST https://papi.dzine.ai/openapi/v1/file/upload

#### **Request Header:**

| Key | Value | Description |
| ----- | ----- | ----- |
| Content-Type | application/json | Specifies the format of the data being sent to the server. |
| Authorization | {API\_KEY} | API key for authenticating requests to the Dzine Developer API. |

#### **Request Body:**

Not required for this endpoint.

#### **Response Body:**

{  
    "code": 200,  
    "msg": "OK",  
    "data": {  
        "file\_path": "https://static.dzine.ai/open\_product/2024/9/629345/1726056682572\_nb015jY9.jpg"  
    }  
}

#### **Code Example:**

BashPythonJavaScript

curl \--location \--request POST 'https://papi.dzine.ai/openapi/v1/file/upload' \\  
\--header 'Authorization: {API\_KEY}' \\  
\--form 'file=@"/C:/Users/admin/Downloads/1721212364855681\_11\_312.jpg"'

### **4\. Text-to-Image**

#### **Description:**

Generates images based on text prompts. The underlying base models used are S and X.

#### **Request URL:**

POST https://papi.dzine.ai/openapi/v1/create\_task\_txt2img

#### **Request Header:**

| Key | Value | Description |
| ----- | ----- | ----- |
| Content-Type | application/json | Specifies the format of the data being sent to the server. |
| Authorization | {API\_KEY} | API key for authenticating requests to the Dzine Developer API. |

#### **Request Body:**

| Key | Type | Required | Default Value | Description |
| ----- | ----- | ----- | ----- | ----- |
| prompt | string | Yes | \-- | The text prompt used to generate the image. Maximum of 800 characters. |
| style\_code | string | Yes | \-- | The style code to generate an image from, all style codes are based on the Dzine owned style list. |
| style\_intensity​ | float | No​ | 0 | Defines the strength of the style applied to the generated image. It is a floating-point value restricted to discrete increments within the inclusive range of 0 to 1, with valid values limited to the following: 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, and 1\. |
| quality\_mode | int | No | 0 | Controls the image generation quality: 0 for standard quality, 1 for high quality (enhances detail). |
| seed | int | No | Random Integer | A random seed for variation in image generation. Acceptable values range from 1 to 2147483647 (INT32\_MAX). |
| target\_h | int | Yes | \-- | The height of the output image, between 128 and 1536 pixels. |
| target\_w | int | No | \-- | The width of the output image, between 128 and 1536 pixels. |
| generate\_slots | list\[int\] | No | Model S: \[1,1,1,1\]; Model X: \[1,1\] | Specifies how many images to generate per model. For Model S, there are 4 slots by default; for Model X, there are 2 slots. A slot value of 1 generates an image, while a value of 0 disables it. |
| output\_format | string | No | webp | Set the output image format to "jpeg" or "webp", "webp" is the default format. |

#### **Response Body:**

{  
  "code": 200,  
  "msg": "OK",  
  "data": {  
    "task\_id": "txt2img\_113101237258\_784633107\_S2\_2\_2"   
  }  
}

Use the task\_id to retrieve task details and progress by utilizing the get\_task\_detail and get\_task\_progress endpoints.

#### **Code Example:**

BashPythonJavaScript

curl \--location \--request POST 'https://papi.dzine.ai/openapi/v1/create\_task\_txt2img' \\  
\--header 'Authorization: {API\_KEY}' \\  
\--header 'Content-Type: application/json' \\  
\--data-raw '{  
  "prompt": "A little boy plays football in the yard with a dog sitting next to him",  
  "generate\_slots": \[  
    1,  
    0,  
    0,  
    0  
  \],  
  "style\_code": "Style-7feccf2b-f2ad-43a6-89cb-354fb5d928d2",  
  "style\_intensity": 1,  
  "quality\_mode": 0,  
  "seed": 1234,  
  "target\_h": 1024,  
  "target\_w": 1024  
}'

### **5\. Image-to-Image**

#### **Description:**

Generate images based on a source image along with additional text prompts.

#### **Request URL:**

POST https://papi.dzine.ai/openapi/v1/create\_task\_img2img

#### **Request Header:**

| Key | Value | Description |
| ----- | ----- | ----- |
| Content-Type | application/json | Specifies the format of the data being sent to the server. |
| Authorization | {API\_KEY} | API key for authenticating requests to the Dzine Developer API. |

#### **Request Body:**

| Key​ | Type​ | Required​​ | Default Value​ | Description​ |
| ----- | ----- | ----- | ----- | ----- |
| prompt​ | string​ | Yes​ | \--​ | The text prompt used to generate the image. Maximum of 800 characters. |
| style\_code​ | string​ | Yes​ | \--​ | The specific style code from the Dzine style list to apply to the image generation. |
| style\_intensity​ | float | No​ | 0 | Defines the strength of the style applied to the generated image. It is a floating-point value restricted to discrete increments within the inclusive range of 0 to 1, with valid values limited to the following: 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, and 1\. |
| structure\_match | float | No​ | 0​ | Determines the strength of maintaining the input image's content structures. It is a floating-point value restricted to discrete increments within the inclusive range of 0 to 1, with valid values limited to the following: 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, and 1\. |
| quality\_mode​ | int​ | No​ | 0​ | Controls the image generation quality: 0 for standard quality, 1 for high quality (enhances detail). |
| color\_match | int​ | No​ | 0​ | Enable color match to preserve the original color tones in the generationed image.(0: disable, 1: enable) |
| seed​ | int​ | No​ | Random Integer​ | A random seed for variation in image generation. Acceptable values range from 1 to 2147483647 (INT32\_MAX). |
| face\_match​​ | int​ | No​ | 0​ | Enables face matching to preserve facial identities in the generated image. (0: off, 1: on) |
| images​ | list\[dict\]​ | YES​​ | \--​ | Use a public accessible image URL or base64-encoded image data as the reference for the image generation process, this image must be under 10M in size. |
| generate\_slots​ | list\[int\]​ | No​ | Model S: \[1,1,1,1\]; | Specifies how many images to generate. 4 slots by default. A slot value of 1 generates an image, while 0 disables it. |
| output\_format | string | No | webp | Set the output image format to "jpeg" or "webp", "webp" is the default format. |

Image Requirements and Orientation

The image data has a size limit of 10 MB. Ensure input images are correctly oriented before uploading to the API. Rotated images (e.g., 90 degrees) may cause unexpected results. Checking and adjusting the orientation beforehand will help ensure accurate processing.

\# Option 1: Pass base64 encoded image data as source image  
{  
    "images": \[  
        {  
            "base64\_data": "data:image/png;base64,iVBORw0KG..."  
        }  
    \]  
}  
\# Option 2: Pass image by public accessible URL  
{  
    "images": \[  
        {  
            "url": "https://static.dzine.ai/open\_product/2024/9/629345/1726056682572\_nb015jY9.jpg"  
        }  
    \]  
}

#### **Response Body:**

{  
  "code": 200,  
  "msg": "OK",  
  "data": {  
    "task\_id": "txt2img\_113101237258\_784633107\_S2\_2\_2"  
  }  
}

Use the task\_id to retrieve task details and progress by utilizing the get\_task\_detail and get\_task\_progress endpoints.

#### **Code Example:**

BashPythonJavaScript

*\#Read image data from file and encode it to base64*  
image\_path="/tmp/test\_image.png"  
base64\_image=$(base64 \-w 0 "$image\_path")

*\#Update the data dictionary with the base64 encoded image data*  
data='{  
  "prompt": "A little boy plays football in the yard with a dog sitting next to him",  
  "style\_code": "Style-7feccf2b-f2ad-43a6-89cb-354fb5d928d2",  
  "style\_intensity": 0.9,  
  "structure\_match": 0.8,  
  "color\_match": 0,  
  "quality\_mode": 0,  
  "generate\_slots": \[1, 0, 0, 0\],  
  "seed": 1234,  
  "face\_match": 0,  
  "images": \[  
    {  
      "base64\_data": "data:image/png;base64,'"$base64\_image"'"  
    }  
  \]  
}'

*\#Make the POST request with the updated data*  
url="https://papi.dzine.ai/openapi/v1/create\_task\_img2img"  
API\_KEY="{API\_KEY}"  
response=$(curl \-X POST \-H "Authorization: $API\_KEY" \-H "Content-Type: application/json" \-d "$data" $url)  
echo $response

### **6\. Get Task Detail**

#### **Description:**

Retrieve detailed metadata for the specified task\_id. The task detail data will expire after 2 hours, making it suitable for managing the image generation process, but not for persistent storage or long-term queries.

#### **Request URL:**

GET https://papi.dzine.ai/openapi/v1/get\_task\_detail/{task\_id}

Replace {task\_id} with the actual task ID

#### **Request Header:**

| Key | Value | Description |
| ----- | ----- | ----- |
| Content-Type | application/json | Specifies the format of the data being sent to the server. |
| Authorization | {API\_KEY} | API key for authenticating requests to the Dzine Developer API. |

#### **Request Body:**

Not required for this endpoint.

#### **Response Body:**

{  
  "code": 200,  
  "msg": "OK",  
  "data": {  
    "task\_detail": {  
      "color\_match": 1,  
      "face\_match": 1,  
      "generate\_slots": \[  
        1,  
        1,  
        1,  
        1  
      \],  
      "prompt": "A little boy plays football in the yard with a dog sitting next to him",  
      "quality\_mode": 1,  
      "seed": 111,  
      "structure\_match": 0.8,  
      "style\_code": "Style-7feccf2b-f2ad-43a6-89cb-354fb5d928d2",  
      "style\_intensity": 0.9  
    }  
  }  
}

#### **Code Example:**

BashPythonJavaScript

curl \--location \--request GET 'https://papi.dzine.ai/openapi/v1/get\_task\_detail/img2img\_113101237258\_348778230\_S2\_2\_10'  
\--header 'Authorization: {API\_KEY}'

### **7\. Get Task Progress**

#### **Description:**

Retrieve the task progress data for the specified task\_id. The task progress data will expire after 2 hours, making it suitable for monitoring the image generation process, but not for persistent storage or long-term queries.

#### **Request URL:**

GET https://papi.dzine.ai/openapi/v1/get\_task\_progress/{task\_id}

Replace {task\_id} with the actual task ID

#### **Request Header:**

| Key | Value | Description |
| ----- | ----- | ----- |
| Content-Type | application/json | Specifies the format of the data being sent to the server. |
| Authorization | {API\_KEY} | API key for authenticating requests to the Dzine Developer API. |

#### **Request Body:**

Not required for this endpoint.

#### **Response Body:**

{  
  "code": 200,  
  "msg": "OK",  
  "data": {  
    "task\_id": "img2img\_113101237258\_348778230\_S2\_2\_10",  
    "status": "success",  
    "error\_reason": "",  
    "generate\_result\_slots": \[  
      "https://static.dzine.ai/open\_product/2024/9/113101237258/img2img/1\_output\_1725932826088188\_NwAVe.webp",  
      "https://static.dzine.ai/open\_product/2024/9/113101237258/img2img/2\_output\_1725932826088188\_NwAVe.webp",  
      "https://static.dzine.ai/open\_product/2024/9/113101237258/img2img/3\_output\_1725932826088188\_NwAVe.webp",  
      "https://static.dzine.ai/open\_product/2024/9/113101237258/img2img/4\_output\_1725932826088188\_NwAVe.webp"  
    \]  
  }  
}

More Information about the generate\_result\_slots:

If you request image generation with the parameter generate\_slots=\[0,1,1,0\], then the task progress data will return the following results:

generate\_result\_slots=\[  
  "",  
  "https://static.dzine.ai/stylar\_product/p/12561609/img2img/1\_output\_1725690981625518\_OIci.webp",  
  "https://static.dzine.ai/stylar\_product/p/12561609/img2img/1\_output\_1725690981625518\_OIci.webp",  
  ""  
\]

More Information about status:

The possible values for status are: waiting / in\_queue / processing / uploading / succeeded / failed

More Information about the output images:

The output images are stored on the Dzine CDN for 1 month. Ensure to save them to your local storage within that period based on your requirements.

#### **Code Example:**

BashPythonJavaScript

curl \--location \--request GET 'https://papi.dzine.ai/openapi/v1/get\_task\_progress/img2img\_113101237258\_348778230\_S2\_2\_10' \\  
\--header 'Authorization: {API\_KEY}'

### **8\. Face Swap**

#### **Description:**

Face-Swap denotes a method wherein the face of an individual from the source image is digitally superimposed onto the countenance of another individual from the target image. Users can upload their source image containing the source face and subsequently upload the target image featuring the target face. To ensure high flexibility and operational efficacy, the swapping process encompasses three distinct stages.

* Face-Detect Stage: Utilize the Face-Detect API to identify the facial structures within both the source and target images, extracting the facial attributes present in these two images.  
* Face-Select Stage: Based on the result of Face-Detect stage, select the source and target faces, collect the encoded facial characteristics as request parameters for subsequent Face-Swapping.  
* Face-Swap Stage: Utilize the Face-Swap API to transfer the facial attributes of the source face onto the target face while conserving the original facial expressions and intricacies.

#### **8.1 Face-Detect Stage:**

#### **Face-Detect API Request URL:**

POST https://papi.dzine.ai/openapi/v1/face\_detect

Detect faces within the uploaded image.  
Ensuring the right facial proportions in the image can significantly improve the accuracy of face detection. Hence, it's recommended to use images where the facial proportions do not exceed 80% when performing face detection.

#### **Face-Detect API Request Header:**

| Key | Value | Description |
| ----- | ----- | ----- |
| Content-Type | application/json | Specifies the format of the data being sent to the server. |
| Authorization | {API\_KEY} | API key for authenticating requests to the Dzine Developer API. |

#### **Face-Detect API Request Body:**

| Key​ | Type​ | Required​​ | Default Value​ | Description​ |
| ----- | ----- | ----- | ----- | ----- |
| images​ | list\[dict\]​ | YES​​ | \--​ | Use a public accessible image URL or base64-encoded image data as the reference for the image generation process, this image must be under 10M in size. |

\# Option 1: Pass image by base64\_encoded image data  
{  
    "images": \[  
        {  
            "base64\_data": "data:image/png;base64,iVBORw0KG..."  
        }  
    \]  
}  
\# Option 2: Pass image by public accessible URL  
{  
    "images": \[  
        {  
            "url": "https://static.dzine.ai/open\_product/2024/9/629345/1726056682572\_nb015jY9.jpg"  
        }  
    \]  
}

#### **Face-Detect API Response Body:**

{  
    "code": 200,  
    "msg": "OK",  
    "data": {  
        "file\_path": "https://static.dzine.ai/open\_product/2024/9/113101237258/img2img/1\_output\_1725932826088188\_NwAVe.webp",  
        "face\_list": \[  
            {  
              "bbox": \[445.84930419921875, 105.05033111572266, 609.7139282226562, 343.38836669921875\],  
              "kps": \[  
                  \[489.34039306640625, 202.99522399902344\],  
                  \[564.6195068359375, 201.42599487304688\],  
                  \[527.2561645507812, 252.1044921875\],  
                  \[493.06207275390625, 275.373046875\],  
                  \[566.2928466796875, 273.81744384765625\]  
              \]  
            }  
        \]  
    }  
}

#### **Face-Detect API Code Example:**

BashPythonJavaScript

*\#Request with URL image*  
curl \--location \--request POST 'https://papi.dzine.ai/openapi/v1/face\_detect' \--header 'Authorization: {API\_KEY}' \--header 'Content-Type: application/json' \--data-raw '{  
    "images": \[  
        {  
            "url": "https://static.dzine.ai/stylar\_product/p/12917231/img2video/1727457013576\_14LI51m5\_xBgcFB60.webp"  
        }  
    \]  
}'

*\#Request with base64 image data*  
curl \--location \--request POST 'https://papi.dzine.ai/openapi/v1/face\_detect' \--header 'Authorization: {API\_KEY}' \--header 'Content-Type: application/json' \--data-raw '{  
    "images": \[  
        {  
            "base64\_data": "data:image/png;base64,iVBORw0KG..."  
        }  
    \]  
}'

#### **8.2 Face-Select Stage:**

After detecting the faces in the source and target images, please gather the Key Points (KPS) and Bounding Box (BBox) data for the upcoming Face-Swap stage.

More Information about the KPS and BBox during face recognition:

\* KPS(Key Points) in face analysis are the detected coordinates (usually 5 or 68 points) on a human face, which help in understanding the structure and orientation of the face.

\* BBox(Bounding Box) is a rectangular box that encloses a human face in an image. A bounding box is usually defined by 2 points:  
   	1\. Top-left corner (x1, y1): The coordinates of the upper-left point of the box.  
   	2\. Bottom-right corner (x2, y2): The coordinates of the lower-right point of the box.

For the BBox data from above Face-Detect result as following: "bbox": \[445.84930419921875, 105.05033111572266, 609.7139282226562, 343.38836669921875\] , It signifies 2 points:  
   	1\. Top-left corner (x1, y1) \= (445.84930419921875, 105.05033111572266)  
   	2\. Bottom-right corner (x2, y2) \= (609.7139282226562, 343.38836669921875)

#### **8.3 Face-Swap Stage:**

#### **Face-Swap API Request URL:**

POST https://papi.dzine.ai/openapi/v1/create\_task\_face\_swap

#### **Face-Swap API Request Header:**

| Key | Value | Description |
| ----- | ----- | ----- |
| Content-Type | application/json | Specifies the format of the data being sent to the server. |
| Authorization | {API\_KEY} | API key for authenticating requests to the Dzine Developer API. |

#### **Face-Swap API Request Body:**

| Key​ | Type​ | Required​​ | Default Value​ | Description​ |
| ----- | ----- | ----- | ----- | ----- |
| source\_face\_image | string​ | Yes​ | \--​ | The source image URL containing the source face. |
| dest\_face\_image | string​ | Yes​ | \--​ | The target image URL containing the target face.​ |
| source\_face\_coordinate | object | Yes​ | \--​ | The source face coordinates and structure from the source image. |
| dest\_face\_coordinate | object | Yes​ | \--​ | The target face coordinates and structure from the target image. |
| generate\_slots​ | list\[int\]​ | No​ | Model S: \[1,1,1,1\]; | Specifies how many images to generate. 4 slots by default. A slot value of 1 generates an image, while 0 disables it. Slots 2 and 4 are better suited for realistic scenes, potentially yielding superior results, whereas slots 1 and 3 are more effective for non-realistic scenes. |
| output\_format | string | No | webp | Set the output image format to "jpeg" or "webp", "webp" is the default format. |

{  
    "source\_face\_image": "https://static.dzine.ai/open\_product/2024/9/113101237258/face\_detect/2172593282608\_source.webp",  
    "dest\_face\_image": "https://static.dzine.ai/open\_product/2024/9/113101237258/face\_detect/2172593282608\_dest.webp",  
    "source\_face\_coordinate": {  
        "bbox": \[445.84930419921875, 105.05033111572266, 609.7139282226562, 343.38836669921875\],  
        "kps": \[  
            \[489.34039306640625, 202.99522399902344\],  
            \[564.6195068359375, 201.42599487304688\],  
            \[527.2561645507812, 252.1044921875\],  
            \[493.06207275390625, 275.373046875\],  
            \[566.2928466796875, 273.81744384765625\]  
        \]  
    },  
    "dest\_face\_coordinate": {  
        "bbox": \[445.84930419921875, 105.05033111572266, 609.7139282226562, 343.38836669921875\],  
        "kps": \[  
            \[489.34039306640625, 202.99522399902344\],  
            \[564.6195068359375, 201.42599487304688\],  
            \[527.2561645507812, 252.1044921875\],  
            \[493.06207275390625, 275.373046875\],  
            \[566.2928466796875, 273.81744384765625\]  
        \]  
    },  
    "generate\_slots": \[1, 1, 1, 1\]  
}

#### **Face-Swap API Response Body:**

{  
    "code": 200,  
    "msg": "OK",  
    "data": {  
        "task\_id": "faceswap\_2147496720\_1728963958008\_\_1\_8"  
    }  
}

#### **Face-Swap API Code Example:**

BashPythonJavaScript

curl \--location \--request POST 'https://papi.dzine.ai/openapi/v1/create\_task\_face\_swap' \\  
\--header 'Authorization: {API\_KEY}' \\  
\--header 'Content-Type: application/json' \\  
\--data-raw '{  
    "source\_face\_image": "https://static.dzine.ai/open\_product/2024/9/113101237258/face\_detect/2172593282608\_source.webp",  
    "dest\_face\_image": "https://static.dzine.ai/open\_product/2024/9/113101237258/face\_detect/2172593282608\_dest.webp",  
    "source\_face\_coordinate": {  
        "bbox": \[445.84930419921875, 105.05033111572266, 609.7139282226562, 343.38836669921875\],  
        "kps": \[  
            \[489.34039306640625, 202.99522399902344\],  
            \[564.6195068359375, 201.42599487304688\],  
            \[527.2561645507812, 252.1044921875\],  
            \[493.06207275390625, 275.373046875\],  
            \[566.2928466796875, 273.81744384765625\]  
        \]  
    },  
    "dest\_face\_coordinate": {  
        "bbox": \[445.84930419921875, 105.05033111572266, 609.7139282226562, 343.38836669921875\],  
        "kps": \[  
            \[489.34039306640625, 202.99522399902344\],  
            \[564.6195068359375, 201.42599487304688\],  
            \[527.2561645507812, 252.1044921875\],  
            \[493.06207275390625, 275.373046875\],  
            \[566.2928466796875, 273.81744384765625\]  
        \]  
    },  
    "generate\_slots": \[1, 1, 1, 1\]  
}'

### **9\. Upscale**

#### **Description:**

Improve image resolution and quality while preserving its original content.

#### **Request URL:**

POST https://papi.dzine.ai/openapi/v1/create\_task\_upscale

#### **Request Header:**

| Key | Value | Description |
| ----- | ----- | ----- |
| Content-Type | application/json | Specifies the format of the data being sent to the server. |
| Authorization | {API\_KEY} | API key for authenticating requests to the Dzine Developer API. |

#### **Request Body:**

| Key​ | Type​ | Required​​ | Default Value​ | Description​ |
| ----- | ----- | ----- | ----- | ----- |
| upscaling\_resize | float | No​ | 2​ | Defines the image's upscale ratio (1.5, 2, 3, 4), with a default value of 2. |
| images​ | list\[dict\]​ | YES​​ | \--​ | Use a public accessible image URL or base64-encoded image data as the reference for the image generation process, this image must be under 10M in size. |
| output\_format | string | No | jpg | Set the output image format to "jpg" or "png", "png" is the default format. |

Image Requirements and Orientation

The image data has a size limit of 10 MB. Ensure input images are correctly oriented before uploading to the API. Rotated images (e.g., 90 degrees) may cause unexpected results. Checking and adjusting the orientation beforehand will help ensure accurate processing.

\# Option 1: Pass base64 encoded image data as source image  
{  
    "images": \[  
        {  
            "base64\_data": "data:image/png;base64,iVBORw0KG..."  
        }  
    \]  
}  
\# Option 2: Pass image by public accessible URL  
{  
    "images": \[  
        {  
            "url": "https://static.dzine.ai/open\_product/2024/9/629345/1726056682572\_nb015jY9.jpg"  
        }  
    \]  
}

#### **Response Body:**

{  
  "code": 200,  
  "msg": "OK",  
  "data": {  
    "task\_id": "upscale\_113101237258\_784633107\_S2\_2\_2"  
  }  
}

Use the task\_id to retrieve task details and progress by utilizing the get\_task\_detail and get\_task\_progress endpoints.

#### **Code Example:**

BashPythonJavaScript

*\#Read image data from file and encode it to base64*  
image\_path="/tmp/test\_image.png"  
base64\_image=$(base64 \-w 0 "$image\_path")

*\#Update the data dictionary with the base64 encoded image data*  
data='{  
  "upscaling\_resize": 1.5,  
  "output\_format": "png",  
  "images": \[  
    {  
      "base64\_data": "data:image/png;base64,'"$base64\_image"'"  
    }  
  \]  
}'

*\#Make the POST request with the updated data*  
url="https://papi.dzine.ai/openapi/v1/create\_task\_upscale"  
API\_KEY="{API\_KEY}"  
response=$(curl \-X POST \-H "Authorization: $API\_KEY" \-H "Content-Type: application/json" \-d "$data" $url)  
echo $response  
