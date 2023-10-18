import { PostEntity } from '@/posts/entities/post.entity';
import { RoleEntity } from '@/roles/entities/role.entity';
import { UserStatusEntity } from '@/statuses/entities/user-status.entity';
import { TopicEntity } from '@/topics/entities/topic.entity';
import { hashPassword } from '@/utils/password-hash';
import { Exclude, Transform } from 'class-transformer';

import {
  AfterLoad,
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstname: string;

  @Column({ nullable: true })
  lastname?: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  @Exclude({ toPlainOnly: true })
  password: string;

  @Exclude({ toPlainOnly: true })
  previousPassword: string;

  @AfterLoad()
  loadPreviousPassword(): void {
    this.previousPassword = this.password;
  }

  @Exclude({ toPlainOnly: true })
  @Column({ nullable: true })
  confirmationToken?: string;

  @Exclude({ toPlainOnly: true })
  @Column({ nullable: true })
  confirmationTokenExpirationDate?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @OneToMany(() => PostEntity, (post) => post.author)
  posts: PostEntity[];

  @ManyToOne(() => RoleEntity, {
    eager: true,
  })
  @Transform(({ obj }) => obj?.role?.name)
  role: RoleEntity;

  @ManyToOne(() => UserStatusEntity, {
    eager: true,
  })
  @Transform(({ obj }) => obj?.status?.name)
  status: UserStatusEntity;

  @ManyToMany(() => TopicEntity, (topic) => topic.users)
  topics: TopicEntity[];

  @BeforeInsert()
  @BeforeUpdate()
  async setPassword() {
    if (this.previousPassword !== this.password && this.password) {
      this.password = await hashPassword(this.password);
    }
  }
}
