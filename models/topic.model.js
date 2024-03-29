import { Model } from 'sequelize';
import { TOPIC_CONTENT } from '../utils/constants/content.js';

export default (sequelize, DataTypes) => {
  class Topic extends Model {
    static associate(models) {
      // define association here
      this.belongsToMany(models.User, {
        foreignKey: 'userId',
        as: 'users',
        through: 'TopicUsers',
      });
      this.belongsToMany(models.Post, {
        foreignKey: 'postId',
        as: 'posts',
        through: 'PostTopic',
      });
      this.hasOne(models.Page, { foreignKey: 'pageId', as: 'page' });
      this.hasMany(models.Category, {
        foreignKey: 'topicId',
        as: 'categories',
      });
      this.belongsTo(models.Topic, { foreignKey: 'parentId', as: 'parent' });
      this.hasMany(models.Topic, { foreignKey: 'parentId', as: 'children' });
    }
  }

  Topic.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
        },
      },
      image: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: 'active',
        validate: {
          isIn: {
            args: [['active', 'inactive']],
            msg: 'Incorect topic status value',
          },
        },
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      content: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: TOPIC_CONTENT.POSTS,
        validate: {
          isIn: {
            args: [[TOPIC_CONTENT.PAGE, TOPIC_CONTENT.POSTS]],
            msg: 'Incorect topic content value',
          },
        },
      },
    },
    {
      sequelize,
      modelName: 'Topic',
    }
  );
  return Topic;
};
