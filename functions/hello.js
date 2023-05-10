// functions/hello.js文件中的代码
exports.handler = async (event, context) => {
    // 获取抖音小程序发送过来的数据
    const data = JSON.parse(event.body);
    // 打印数据到控制台
    console.log("抖音小程序数据："+data);
  
    // 对数据进行任何操作（比如存储到数据库，调用其他API等）
    // 这里只是简单地把数据原样返回
    // 返回一个响应对象
    return {
      statusCode: 200,
      body: JSON.stringify("接到数据")
    };
  };
