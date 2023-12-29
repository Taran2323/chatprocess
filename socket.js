module.exports = function (io) {
  io.on("connection", (socket) => {
    // ********************  Handle socket connections********************/
    socket.on("connect_user", async function (connect_listener) {
      try {
        console.log(connect_listener, "---------------");
        let socket_id = socket.id;
        let check_user = await socket_user.findOne({
          user: connect_listener.userid,
        });
        let create_socket_user;
        if (check_user) {
          create_socket_user = await socket_user.updateOne(
            {
              _id: check_user._id,
            },
            {
              online: true,
              socketId: socket_id,
            }
          );
        } else {
          if (connect_listener.userid && socket_id) {
            var createSocket = await socket_user.create({
              user: connect_listener.userid,
              socketId: socket_id,
              online: 1,
            });
          } else {
            throw new Error("Both userid and socketId are required");
          }
        }
        socket.emit("connect_user_listener", {
          success_message: "User Connected",
        });
      } catch (error) {
        console.log(error);
      }
    });

    // ********************  Handle socket disconnections********************/
    socket.on("disconnect_user", async (data) => {
      try {
        let socket_id = data.id;
        const result = await socket_user.findOneAndUpdate(
          {
            socketId: socket_id,
          },
          {
            $set: {
              online: false,
            },
          }
        );
        socket.emit("disconnect_user", {
          success_message: "User disconnected",
        });
      } catch (error) {
        console.log("kkkkkkkkkkk", error);
      }
    });

    // ********************* Handle chat message events***************************/

    socket.on("send_message", async (data) => {
      try {
        let get_room = await socket_room.findOne({
          $or: [
            {
              sender_id: data.sender_id,
              receiver_id: data.receiver_id,
            },
            {
              receiver_id: data.sender_id,
              sender_id: data.receiver_id,
            },
          ],
        });

        if (!get_room) {
          get_room = await socket_room.create({
            sender_id: data.sender_id,
            receiver_id: data.receiver_id,
          });
        }
        let constant = Math.round(new Date().getTime() / 1000);
        let message_create = await socket_messages.create({
          sender_id: data.sender_id,
          receiver_id: data.receiver_id,
          message_type: data.message_type,
          message: data.message,
          room_id: get_room._id,
          constant_id: constant,
        });

        let rooms = await socket_room.updateOne(
          {
            $or: [
              {
                sender_id: data.sender_id,
                receiver_id: data.receiver_id,
              },
              {
                receiver_id: data.sender_id,
                sender_id: data.receiver_id,
              },
            ],
          },
          { last_msg_id: message_create._id }
        );

        let get_message = await socket_messages
          .findOne({ _id: message_create._id })
          .populate("sender_id", "name image")
          .populate("receiver_id", "name image");

        let other_user_detail = await socket_user.findOne({
          user: data.sender_id,
        });

        if (other_user_detail && other_user_detail.socketId) {
          let senderId = data.sender_id;
          let sender = await User.findOne({ _id: senderId });
          let receiver = await User.findOne({ _id: data.receiver_id });
          // console.log(receiver,'=-=-=--=-=-=-=-=-')
          var message = `${sender.name} send a message`;

          var notification_data = {
            // "problemId":requestData.problemId,
            message: message,
            push_type: 2,
            sender: sender,
            receiver: receiver,
          };
          console.log(notification_data, "----------notification_data-----");
          //   await Notification.create({
          //     sender_id: data.sender_id,
          //     receiver_id: data.receiver_id,
          //     push_type: 2,
          //     clear_type: 0,
          //     message: message,
          //   });
          let other_user_details = await socket_user.findOne({
            user: data.receiver_id,
          });
          if (other_user_details) {
            io.to(other_user_details.socketId).emit(
              "send_message_listener",
              get_message
            );
          }

          // console.log(receiver.deviceToken)
          if (receiver.status == 0) {
            await helper.send_push_notification(
              receiver.deviceToken,
              receiver.device_type,
              notification_data
            );
          }
          socket.emit("send_message_listener", get_message);
        }
      } catch (error) {
        console.log(error);
      }
    });

    // ********************* Handle chat message events***************************/
    socket.on("get_user_chats", async (data) => {
      try {
        const userChats = await socket_messages
          .find({
            $or: [
              {
                $and: [
                  {
                    sender_id: data.sender_id,
                    receiver_id: data.receiver_id,
                  },
                ],
              },
              {
                $and: [
                  {
                    sender_id: data.receiver_id,
                    receiver_id: data.sender_id,
                  },
                ],
              },
            ],
            deleted_id: {
              $ne: data.sender_id,
            },
          })
          .populate("sender_id", "name image")
          .populate("receiver_id", "name image")
          .sort({ createdAt: 1 });

        // Update the is_read to '0' for all matching messages
        let get = await socket_messages.updateMany(
          {
            is_read: "0",
            sender_id: data.receiver_id,
            receiver_id: data.sender_id,
          },
          {
            $set: {
              is_read: "1",
            },
          }
        );
        // console.log(get);

        const updateuserChats = await socket_messages
          .find({
            $or: [
              {
                $and: [
                  {
                    sender_id: data.sender_id,
                    receiver_id: data.receiver_id,
                  },
                ],
              },
              {
                $and: [
                  {
                    sender_id: data.receiver_id,
                    receiver_id: data.sender_id,
                  },
                ],
              },
            ],
            deleted_id: {
              $ne: data.sender_id,
            },
          })
          .populate("sender_id", "name image")
          .populate("receiver_id", "name image")
          .sort({ createdAt: 1 });

        console.log(updateuserChats, "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk");

        // Emit the user's chats to the client
        socket.emit("get_user_chats_listener", updateuserChats);
      } catch (error) {
        console.error(error);
      }
    });

    // ************************************* handle read meassage *********************************************

    socket.on("is_read", async function (data) {
      if (data) {
        console.log(data, "................");
        let get = await socket_messages.updateMany(
          {
            receiver_id: data.receiver_id,
            // constant_id: data.constant_id
            sender_id: data.sender_id,
          },
          { is_read: "1" }
        );

        socket.emit("is_read_listener", get);
      }
    });

    // ************************************* handle count unread meassage *********************************************

    socket.on("count_unread", async function (data) {
      let { sender_id, receiver_id } = data;

      let unreadMessages = await socket_messages.find({
        sender_id,
        receiver_id,
        is_read: "0",
      });

      socket.emit("count_unread_listener", unreadMessages.length);
    });

    // ************************** all chats ******************************* */
    socket.on("get_chat_list", async (data) => {
      try {
        var { sender_id } = data;
        const chatList = await socket_room
          .find({
            $or: [
              {
                sender_id: sender_id,
              },
              {
                receiver_id: sender_id,
              },
            ],
          })
          .populate("sender_id", "name image")
          .populate("receiver_id", "name image")
          .populate("last_msg_id", "message createdAt")
          .sort({ createdAt: -1 });
        let sender = sender_id;
        let receiverid = chatList.map((chat) => chat.receiver_id._id);
        const result = await Promise.all(
          chatList.map(async (el) => {
            const socketMessagesArr = await socket_messages.find({
              sender_id: el.sender_id.id,
              receiver_id: sender,
              is_read: "0",
            });
            return {
              ...el.toObject(),
              count: socketMessagesArr.length,
            };
          })
        );
        socket.emit("get_chat_list_listener", result);
      } catch (error) {
        console.log(error);
      }
    });

    // ********************** clear chat******************************* *

    socket.on("clear_chat", async (data) => {
      try {
        const { sender_id, receiver_id } = data;
        await socket_messages.deleteMany({
          $or: [
            {
              sender_id: sender_id,
              receiver_id: receiver_id,
            },
            {
              sender_id: receiver_id,
              receiver_id: sender_id,
            },
          ],
          deleted_id: receiver_id,
        });
        await socket_id.updateMany(
          {
            $or: [
              {
                sender_id: sender_id,
                receiver_id: receiver_id,
              },
              {
                sender_id: receiver_id,
                receiver_id: sender_id,
              },
            ],
            deleted_id: null,
          },
          {
            $set: {
              deleted_id: sender_id,
            },
          }
        );

        socket.emit("clear_chat_listener", "Clear Chat successfully");
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // ********************** report user******************************* */
    socket.on("report_user", async (data) => {
      try {
        const reports = await reportModal.create({
          reportBy: data.reportBy,
          reportOn: data.reportOn,
          reportMessage: data.reportMessage,
        });

        success_message = {
          success_message: "report send successfully",
        };
        socket.emit("report_user", success_message);
      } catch (error) {
        console.log(error);
        socket.emit("report_user_listener", {
          error_message: "An error occurred while report.",
        });
      }
    });

    // *********************** blocked user ***************** */

    socket.on("block_user", async (data) => {
      try {
        const { user_id } = data;
        const userToBlock = await User.findById(user_id);
        if (!userToBlock) {
          socket.emit("block_user", { error_message: "User not found." });
          return;
        }
        userToBlock.isBlocked = true;
        await userToBlock.save();
        await socket_user.create({
          user: user_id,
          socketId: socket.id,
          blocked: true,
        });

        socket.emit("block_user", {
          success_message: "User blocked successfully.",
        });
      } catch (error) {
        console.log(error);
        socket.emit("block_user_listener", {
          error_message: "An error occurred while blocking the user.",
        });
      }
    });

    // ************************  Listen for joining a group chat*************************/

    socket.on("joinGroupChat", (groupId) => {
      socket.join(groupId);
      socket.emit("joinGroupChat", {
        message: "You have joined the group successfully",
      });
    });

    // **************************** */ Listen for group chat messages*********************/
    socket.on("groupChatMessage", async (data) => {
      const { groupId, senderId, message } = data;

      try {
        const room = await socket_room.findOne({ group_id: groupId });

        if (!room) {
          await socket_room.create({ group_id: groupId, last_msg_id: null });
        }

        const newMessage = await socket_messages.create({
          sender_id: senderId,
          group_id: groupId,
          message,
        });
        await socket_room.findOneAndUpdate(
          {
            group_id: groupId,
          },
          { last_msg_id: newMessage._id }
        );
        var success_message = "Message sent successfully";
        socket.emit("groupChatMessage", {
          groupId,
          senderId,
          message,
          success_message,
        });
      } catch (error) {
        console.error(error);
      }
    });

    //    //************************** all chats of groups ******************************* */
    // socket.on("get_group_msg", async (data) => {
    //     try {
    //       const { groupId, userid } = data;
    //       const chatList = await socket_room.findOne({ group_id: groupId })
    //         .populate({
    //           path: "group_id",
    //           populate: {
    //             path: "groupMembers.userid",
    //             select: "userName profileImage",
    //             model: "user",
    //           },
    //         })
    //         .populate({
    //           path: "last_msg_id",
    //           populate: {
    //             path: "sender_id",
    //             select: "userName profileImage",
    //             model: "user",
    //           },
    //         });

    //       const messages = await socket_messages.find({
    //         group_id: groupId,
    //         deleted_ids: { $not: { $elemMatch: { $eq: userid } } },
    //       }).populate("sender_id", "image userName");
    //       socket.emit("get_group_msg", chatList, messages);
    //     } catch (error) {
    //       console.log(error);
    //     }
    // });

    // //******************** leave Group************************ */
    // socket.on("leave_group", async (data) => {
    //     try {
    //       const { groupId, userid } = data;
    //       const group = await socket_group.findById(groupId);

    //       if (!group) {
    //         return;
    //       }
    //       const userIndex = group.groupMembers.findIndex(
    //         (member) => member.userid.toString() === userid
    //       );

    //       if (userIndex === -1) {
    //         return;
    //       }
    //       group.groupMembers.splice(userIndex, 1);
    //       await group.save();
    //       var success_message = "Group left successfully";
    //       socket.emit("leave_group", { groupId, success_message });
    //       socket.to(groupId).emit("leave_group", { groupId, userid });
    //     } catch (error) {
    //       console.log(error);
    //     }
    // });

    // //*************************report group******************* */
    // socket.on("report_group", async (data) => {
    // try {
    //     const { groupId, reportBy, reportMessage } = data;
    //     const group = await socket_group.findById(groupId);

    //     if (!group) {
    //       return;
    //     }
    //     const report = new reportModal({
    //       groupId,
    //       reportBy,
    //       reportMessage,
    //     });
    //     await report.save();
    //     var success_message = "Report sent successfully";
    //     socket.emit("report_group", { groupId, success_message });
    // } catch (error) {
    //     console.log(error);
    // }
    // });

    // //************************all groups****************** */
    // socket.on("get_all_groups_with_rooms", async () => {
    // try {
    //     const groups = await socket_group.find();
    //     socket.emit("get_all_groups_with_rooms", groups);
    // } catch (error) {
    //     console.log(error);
    // }
    // });

    // *********************   clear group chat******************/

    socket.on("clear_group_chat", async (data) => {
      try {
        const { groupId, userid } = data;
        await socket_messages.updateMany(
          {
            group_id: groupId,
            $or: [
              {
                sender_id: userid,
              },
              {
                receiver_id: userid,
              },
            ],
            deleted_ids: {
              $ne: userid,
            },
          },
          {
            $push: {
              deleted_ids: userid,
            },
          }
        );
        const updatedMessages = await socket_messages.find({
          group_id: groupId,
          $or: [
            {
              sender_id: userid,
            },
            {
              receiver_id: userid,
            },
          ],
          deleted_ids: {
            $ne: userid,
          },
        });

        const deletedIds = updatedMessages.map((message) => message._id);

        socket.emit("clear_group_chat", {
          message: "Group chat cleared successfully",
          deletedIds,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    socket.on("likes", async function (data) {
      try {
        await liked.create({
          user_id: data.user_id,
          business_id: data.business_id,
          type: data.type,
          job_id: data.job_id,
          status: data.status,
        });

        var usersObj = await User_profile.findOne({ _id: data.user_id });
        var businessObj = await User.findOne({ _id: data.business_id });
        var jobsArr = [];
        var is_match = 0;

        var checkLikeUser = await liked.findOne({
          user_id: data.user_id,
          business_id: data.business_id,
          job_id: data.job_id,
          type: "user",
          status: 0,
        });
        var checkLikeBusiness = await liked.findOne({
          user_id: data.user_id,
          business_id: data.business_id,
          job_id: data.job_id,
          type: "business",
          status: 0,
        });

        if (checkLikeUser && checkLikeBusiness) {
          is_match = 1;
        } else {
          is_match = 0;
        }

        if (checkLikeUser && checkLikeBusiness) {
          // for (let i in checkLike) {
          var user_profile = await User_profile.findOne({
            _id: checkLikeBusiness.user_id,
          });
          var job = await Jobs.findOne({ _id: checkLikeBusiness.job_id });
          var business = await User.findOne({
            _id: checkLikeBusiness.business_id,
          });
          jobsArr.push({
            user_profile: user_profile,
            job: job,
            business: business,
          });
          // }
        }

        var message = `${
          data.type == 1 ? usersObj.name : businessObj.name
        } send a message`;

        // await Notification.create({
        //   sender_id: data.type == "user" ? data.business_id : data.user_id,
        //   receiver_id: data.type == "user" ? data.user_id : data.business_id,
        //   push_type: data.type == "user" ? 3 : 4,
        //   clear_type: 0,
        //   message: message,
        // });
        var notification_data = {
          message: message,
          push_type: data.type == "user" ? 3 : 4,
          sender: data.type == "user" ? usersObj : businessObj,
          receiver: data.type == "user" ? businessObj : usersObj,
        };

        if (data.type == 1 && businessObj.status == 0) {
          await helper.send_push_notification(
            businessObj.deviceToken,
            businessObj.deviceType,
            notification_data
          );
        }

        if (data.type == 2 && usersObj.status == 0) {
          await helper.send_push_notification(
            businessObj.deviceToken,
            businessObj.deviceType,
            notification_data
          );
        }

        var user_id = null;
        if (data.type === "user") {
          var business = await User.findOne({ _id: data.business_id });
          user_id = business._id;
        } else {
          var user = await User.findOne({ _id: usersObj.user_id });
          user_id = user._id;
        }
        var socketUser = await socket_user.findOne({ user: user_id });
        if (is_match == 1) {
          socket.emit("User_like", {
            usersObj: usersObj,
            businessObj: businessObj,
            is_match: is_match,
            jobsArr: jobsArr,
          });

          io.to(socketUser.socketId).emit("User_like", {
            usersObj: usersObj,
            businessObj: businessObj,
            is_match: is_match,
            jobsArr: jobsArr,
          });
        }
      } catch (error) {
        console.error("Error liking job:", error);
      }
    });

    // *********************   Likes and dislikes  ******************/
    // socket.on("likes", async function (data) {
    //     try {
    //         await liked.create({
    //             user_id: data.user_id,
    //             business_id: data.business_id,
    //             job_id: data.job_id,
    //             status: data.status,
    //             type: data.type
    //         });

    //         var usersObj = await User_profile.findOne({_id: data.user_id});
    //         var businessObj = await User.findOne({_id: data.business_id});
    //         var jobsArr = [];
    //         var is_match = 0;

    //         // await

    //         var checkLikeStatus = await liked.find({job_id: data.job_id, status: 0, user_id: data.user_id, business_id: data.business_id});
    //         if (checkLikeStatus.length === 2) {
    //             // if (data.type == "user") {
    //             // var businessLikesCheck = await liked.findOne({
    //             // user_id: data.user_id,
    //             // business_id: data.business_id,
    //             // job_id: "",
    //             // });
    //             // var userLikesCheck = await liked.find({
    //             // user_id: data.user_id,
    //             // business_id: data.business_id,
    //             // job_id: data.job_id,
    //             // });

    //             // is_match = 1;
    //             // await liked.updateOne(
    //             // {
    //             //     user_id: data.user_id,
    //             //     business_id: data.business_id,
    //             // },
    //             // {
    //             //     is_match: 1,
    //             // }
    //             // );
    //             // } else {
    //             // var businessLikeCheck = await liked.findOne({
    //             // user_id: data.user_id,
    //             // business_id: data.business_id,
    //             // job_id: data.job_id,
    //             // // });
    //             // var userLikeCheck = await liked.find({
    //             // user_id: data.user_id,
    //             // business_id: data.business_id,
    //             // job_id: data.job_id,
    //             // });

    //             // if (businessLikeCheck && userLikeCheck.length > 0) {
    //             is_match = 1;
    //             await liked.updateOne({
    //                 user_id: data.user_id,
    //                 business_id: data.business_id
    //             }, {is_match: 1});

    //             var job = await Jobs.findOne({_id: data.job_id});
    //             // for (let i in userLikeCheck) {
    //             var user_profile = await User_profile.findOne({_id: data.user_id});

    //             var business = await User.findOne({_id: data.business_id});

    //             var arr = [{
    //                     user_profile: user_profile,
    //                     job: job,
    //                     business: business
    //                 }];

    //             // }
    //             jobsArr = arr;
    //             // }
    //             // }

    //             var user = await User.findOne({_id: usersObj.user_id});
    //             var message = `${
    //                 data.type == "business" ? businessObj.name : usersObj.name
    //             } send a message`;

    //             await Notification.create({
    //                 sender_id: data.type == "business" ? data.business_id : user._id,
    //                 receiver_id: data.type == "business" ? user._id : data.business_id,
    //                 push_type: data.type == "business" ? 3 : 4,
    //                 clear_type: 0,
    //                 message: message
    //             });
    //             var notification_data = {
    //                 message: message,
    //                 push_type: data.type == "business" ? 3 : 4,
    //                 sender: data.type == "business" ? businessObj : usersObj,
    //                 receiver: data.type == "business" ? usersObj : businessObj
    //             };

    //             let deviceToken = data.type == "business" ? user.deviceToken : businessObj.deviceToken;
    //             let deviceType = data.type == "business" ? user.deviceType : businessObj.deviceType;
    //             deviceToken ? await helper.send_push_notification(deviceToken, deviceType, notification_data) : "";

    //             if (is_match === 1) {
    //                 let like_jobs = await liked.findOne({user_id: data.user_id, job_id: data.job_id});
    //                 // data.type === "user"
    //                 // ? (like_jobs = await liked
    //                 //       .findOne({
    //                 //         user_id: data.user_id,
    //                 //       })
    //                 //       .sort({ $natural: -1 }))
    //                 // : (like_jobs = await liked.findOne({
    //                 //       user_id: data.user_id,
    //                 //     }));

    //                 var user_profile = await User_profile.findOne({_id: data.user_id});
    //                 var job = await Jobs.findOne({_id: like_jobs.job_id});

    //                 var business = await User.findOne({_id: data.business_id});

    //                 let jobsArrNew = [{
    //                         user_profile: user_profile,
    //                         job: job,
    //                         business: business
    //                     },];

    //                 if (data.type == "user") {
    //                     console.log("user----------------------");
    //                     let socketCon = await socket_user.findOne({user: businessObj._id});
    //                     io.to(socketCon.socketId).emit("User_like", {
    //                         usersObj: usersObj,
    //                         businessObj: businessObj,
    //                         is_match: is_match,
    //                         jobsArr: jobsArrNew
    //                     });
    //                 } else if (data.type == "business") {
    //                     console.log("bus----------------------");
    //                     let socketCon = await socket_user.findOne({user: user._id});

    //                     // let dd = await Jobs.find({ _id: data.job_id });
    //                     io.to(socketCon.socketId).emit("User_like", {
    //                         usersObj: usersObj,
    //                         businessObj: businessObj,
    //                         is_match: is_match,
    //                         jobsArr: jobsArrNew
    //                     });
    //                 }
    //             }
    //         }

    //         socket.emit("User_like", {
    //             usersObj: usersObj,
    //             businessObj: businessObj,
    //             is_match: is_match,
    //             jobsArr: jobsArr
    //         });

    //         // return

    //         // var likedObj = await liked.findOne({
    //         //     user_id: data.user_id,
    //         //     business_id: data.business_id,
    //         //     job_id: data.job_id != '' ? data.job_id : ''
    //         // })

    //         // let result = await liked.create({user_id: data.user_id, business_id: data.business_id, job_id: data.job_id, status: data.status})

    //         // var match = await liked.find({user_id: data.user_id, business_id: data.business_id})
    //         // var usersObj = await User_profile.findOne({_id: data.user_id})
    //         // var businessObj = await User.findOne({_id: data.business_id})
    //         // var is_match = ``
    //         // var likesArr = []
    //         // if (match.length > 1) {
    //         //     is_match = 1
    //         //     likesArr = await liked.find({user_id: data.user_id, business_id: data.business_id})
    //         // } else {
    //         //     is_match = 0
    //         // }

    //         // console.log(likesArr, ";l;l;l;l;;l;l;l")
    //         // // return

    //         // if (data.type == 'user') {
    //         //     let get = await User_profile.findOne({_id: data.user_id})
    //         //     let sender = await User.findOne({_id: get.user_id})
    //         //     let receiver = await User.findOne({_id: data.business_id})
    //         //     var message = `${
    //         //         sender.name
    //         //     } send a message`

    //         //     var notification_data = { // "problemId":requestData.problemId,
    //         //         "message": message,
    //         //         push_type: 3,
    //         //         sender: sender,
    //         //         receiver: receiver

    //         //     }
    //         //     await Notification.create({
    //         //         sender_id: sender,
    //         //         receiver_id: receiver,
    //         //         push_type: 3,
    //         //         clear_type: 0,
    //         //         message: message

    //         //     })

    //         //     await helper.send_push_notification(receiver.deviceToken, receiver.device_type, notification_data);
    //         // } else {
    //         //     let sender = await User.findOne({_id: data.business_id})
    //         //     let get = await User_profile.findOne({_id: data.user_id})
    //         //     let receiver = await User.findOne({_id: get.user_id})
    //         //     var message = `${
    //         //         sender.name
    //         //     } send a message`

    //         //     var notification_data = { // "problemId":requestData.problemId,
    //         //         "message": message,
    //         //         push_type: 4,
    //         //         sender: sender,
    //         //         receiver: receiver
    //         //     }

    //         //     await Notification.create({
    //         //         sender_id: sender,
    //         //         receiver_id: receiver,
    //         //         push_type: 4,
    //         //         clear_type: 0,
    //         //         message: message
    //         //     })
    //         //     await helper.send_push_notification(receiver.deviceToken, receiver.device_type, notification_data);
    //         // }

    //         // socket.emit('User_like', {
    //         //     usersObj: usersObj,
    //         //     businessObj: businessObj,
    //         //     is_match: is_match
    //         // })
    //     } catch (error) {
    //         console.error("Error liking job:", error);
    //     }
    // });

    // *********************   call to user  ******************/
    socket.on("call_to_user", async function (data) {
      try {
        const appID = "974673b3930843cbb354672fae0e4be8";
        const appCertificate = "4584ed479ac144b3a47a52ee81f7794b";
        function makeid(length) {
          var result = "";
          var characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
          var charactersLength = characters.length;
          for (var i = 0; i < length; i++) {
            result += characters.charAt(
              Math.floor(Math.random() * charactersLength)
            );
          }
          return result;
        }

        const channelName = makeid(20);
        const uid = 0;
        const expirationTimeInSeconds = 3600;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
        const token = RtcTokenBuilder.buildTokenWithUid(
          appID,
          appCertificate,
          channelName,
          uid,
          privilegeExpiredTs
        );

        let addHistory = await CallHistory.create({
          senderId: mongoose.Types.ObjectId(data.userId),
          receiverId: mongoose.Types.ObjectId(data.friendId),
          type: data.type,
          duration: 0,
          status: 1, // 1=calling, 2=accepted, 3=decline
          token: token,
          channelName: channelName,
        });

        if (data) {
          var sender = await User.findOne({
            _id: mongoose.Types.ObjectId(data.userId),
          }).select("id name image userType");
        }

        if (data) {
          var reciever = await User.findOne({
            _id: mongoose.Types.ObjectId(data.friendId),
          });
        }

        var device_type = reciever.device_type;
        if (device_type == 1) {
          var deviceToken = reciever.voipToken;
        } else {
          var deviceToken = reciever.deviceToken;
        }
        let message = ` Incoming ${data.type == 1 ? "voice" : "video"} call `;
        const collapseId = `${mongoose.Types.ObjectId(
          data.userId
        )}${mongoose.Types.ObjectId(data.friendId)}`;

        var notification_data = {
          title: "Calling",
          push_type: 5,
          message: message,
          type: data.type,
          userId: mongoose.Types.ObjectId(data.userId),
          userName: sender.name,
          userImage: sender.image,
          friendId: mongoose.Types.ObjectId(data.friendId),
          friendName: reciever.name,
          friendImage: reciever.image,
          status: 1,
          token: token,
          channelName: channelName,
        };

        await Notification.create({
          sender_id: mongoose.Types.ObjectId(data.userId),
          receiver_id: mongoose.Types.ObjectId(data.friendId),
          push_type: 5,
          clear_type: 0,
          message: message,
        });
        console.log(device_type, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
        if (device_type == 1) {
          console.log("qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq");
          var send_push_notification = await helper.p8voip(
            deviceToken,
            notification_data,
            collapseId
          );
          console.log(send_push_notification);
        } else {
          let send_push_notification = await helper.send_push_notification(
            deviceToken,
            device_type,
            notification_data
          );
        }
        socket.emit("call_to_user_listner", notification_data);
      } catch (error) {
        console.log(error, "========error=========");
      }
    });

    // *********************  call to status ******************/

    socket.on("call_status", async (data) => {
      try {
        var update = await CallHistory.updateOne(
          {
            channelName: data.channelName,
          },
          {
            status: parseInt(data.status),
          }
        );
        var callingData = await CallHistory.findOne({
          channelName: data.channelName,
        }).lean();
        let message = `${
          parseInt(data.status) == 2 ? "call Accepted" : "call Rejected"
        }`;
        var notification_data = {
          push_type: 6,
          message: message,
          token: callingData.token || "",
          status: parseInt(data.status),
          channelName: callingData.channelName || "",
        };

        const reciever = await User.findOne({ _id: data.friendId })
          .select("name image userType deviceToken device_type voipToken")
          .lean();
        const sender = await User.findOne({ _id: data.userId })
          .select("name image userType deviceToken device_type")
          .lean();
        const payload = {
          title: "Seeke",
          channelName: data.channelName,
          senderName: sender.name,
          senderImage: sender.image,
          senderId: sender._id,
          receiverId: reciever._id,
          receiverName: reciever.name,
          receiverImage: reciever.image,
          videoToken: callingData.token,
          callType: callingData.callType,
          notificationType: 10,
        };
        switch (parseInt(data.status)) {
          case 1:
            payload.title = "Call connected";
            payload.message = "Connected";
            payload.messageType = 1;
            payload.status = 1;
            break;
          case 2:
            payload.title = "Call declined";
            payload.message = "Declined";
            payload.messageType = 2;
            payload.status = 2;
            break;
          case 3:
            payload.title = "Call disconnected";
            payload.message = "Disconnected";
            payload.messageType = 3;
            payload.status = 3;
            break;
          case 4:
            payload.title = "You have missed a video call";
            payload.message = "Missed call";
            payload.messageType = 4;
            payload.status = 4;
            break;
          default:
            payload.title = "You have a new video call";
            payload.message = "Calling";
            payload.messageType = 0;
            payload.status = 0;
        }
        const collapseId = `${mongoose.Types.ObjectId(
          data.userId
        )}${mongoose.Types.ObjectId(data.friendId)}`;
        let device_type = reciever.device_type;

        if (device_type == 1) {
          var deviceToken = reciever.deviceToken;
        } else {
          var deviceToken = reciever.voipToken;
        }
        // var result = await Notification.create({
        //   sender_id: mongoose.Types.ObjectId(data.userId),
        //   receiver_id: mongoose.Types.ObjectId(data.friendId),
        //   push_type: 6,
        //   clear_type: 0,
        //   message: message,
        // });
        if (device_type != 1) {
          let send_push_notification = await helper.p8voip(
            deviceToken,
            payload,
            collapseId
          );
        }

        if (callingData) {
          var get_id = await socket_user
            .findOne({ user: data.friendId })
            .lean();
        }
        io.to(get_id.socketId).emit("acceptReject", notification_data);
        socket.emit("acceptReject", notification_data);
      } catch (er) {
        console.log(er);
      }
    });
  });
};
